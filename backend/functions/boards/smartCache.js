const { GetItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb")
const { randomUUID } = require("crypto")
const OpenAI = require("openai")

const RAW_TEXT_MAX_CHARS = 12000

/**
 * Stable URL comparison for duplicate detection (ignore query/trailing slash case).
 * @param {string} u
 * @returns {string}
 */
function normalizeUrlForDedup(u) {
  const s = String(u).trim()
  if (!s) return ""
  try {
    const x = new URL(s)
    return `${x.origin}${x.pathname}`.replace(/\/$/, "").toLowerCase()
  } catch {
    return s.toLowerCase().replace(/\/$/, "")
  }
}

/**
 * @param {unknown[]} rows
 * @param {string} pageUrl
 * @param {string} extractedJobUrl
 * @returns {boolean}
 */
function jobUrlAlreadyCached(rows, pageUrl, extractedJobUrl) {
  const targets = [
    normalizeUrlForDedup(pageUrl),
    normalizeUrlForDedup(extractedJobUrl),
  ].filter(Boolean)
  if (targets.length === 0) return false

  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const cells =
      row.cells && typeof row.cells === "object" && !Array.isArray(row.cells)
        ? row.cells
        : {}
    for (const v of Object.values(cells)) {
      const nv = normalizeUrlForDedup(v)
      if (!nv) continue
      for (const t of targets) {
        if (t && nv === t) return true
      }
    }
  }
  return false
}

/**
 * Map OpenAI extraction + defaults into per-column cell values.
 * @param {{ id: string, name: string }[]} columns
 * @param {{ companyName: string, jobTitle: string, jobUrl: string, pageUrl: string }} extracted
 * @returns {Record<string, string>}
 */
function mapExtractedToCells(columns, extracted) {
  const { companyName, jobTitle, jobUrl, pageUrl } = extracted
  const urlValue = (jobUrl || pageUrl).trim()

  let companyDone = false
  let titleDone = false
  let urlDone = false

  /** @type {Record<string, string>} */
  const cells = {}

  for (const col of columns) {
    const n = col.name.toLowerCase()
    if (n.includes("status")) {
      cells[col.id] = "Applied"
    } else if (
      !companyDone &&
      (n.includes("company") || n.includes("employer"))
    ) {
      cells[col.id] = companyName
      companyDone = true
    } else if (
      !titleDone &&
      (n.includes("title") ||
        n.includes("role") ||
        (n.includes("position") && !n.includes("status")))
    ) {
      cells[col.id] = jobTitle
      titleDone = true
    } else if (
      !urlDone &&
      (n.includes("url") || n.includes("link") || n.includes("apply"))
    ) {
      cells[col.id] = urlValue
      urlDone = true
    } else {
      cells[col.id] = ""
    }
  }

  return cells
}

/**
 * POST /boards/{boardId}/smart-cache — OpenAI extraction + append row.
 * @param {{
 *   client: import("@aws-sdk/client-dynamodb").DynamoDBClient,
 *   tableName: string,
 *   pk: string,
 *   pathBoardId: string,
 *   payload: Record<string, unknown>,
 *   json: (statusCode: number, body: object) => object,
 *   sanitizeColumns: (raw: unknown) => { id: string, name: string }[],
 *   normalizeCellsForBoard: (columns: { id: string, name: string }[], cellsRaw: unknown) => { ok: boolean, message?: string, cells?: Record<string, string> },
 *   cellsHaveAtLeastOneNonWhitespaceValue: (cells: Record<string, string>) => boolean,
 * }} ctx
 */
async function handleSmartCache(ctx) {
  const {
    client,
    tableName,
    pk,
    pathBoardId,
    payload,
    json,
    sanitizeColumns,
    normalizeCellsForBoard,
    cellsHaveAtLeastOneNonWhitespaceValue,
  } = ctx

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !String(apiKey).trim()) {
    return json(500, { message: "Server configuration error" })
  }

  const rawText =
    typeof payload.rawText === "string" ? payload.rawText : ""
  const pageUrl = typeof payload.url === "string" ? payload.url : ""
  if (!rawText || !pageUrl) {
    return json(400, { message: "rawText and url are required strings" })
  }

  const getRes = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({
        PK: pk,
        SK: `BOARD#${pathBoardId}`,
      }),
    }),
  )
  if (!getRes.Item) {
    return json(404, { message: "Board not found" })
  }
  const boardRow = unmarshall(getRes.Item)
  if (!String(boardRow.SK ?? "").startsWith("BOARD#")) {
    return json(404, { message: "Board not found" })
  }

  const columns = sanitizeColumns(boardRow.columns)
  if (columns.length === 0) {
    return json(400, { message: "Board has no columns" })
  }

  const openai = new OpenAI({ apiKey: String(apiKey).trim() })
  const textSlice = rawText.slice(0, RAW_TEXT_MAX_CHARS)

  let companyName = ""
  let jobTitle = ""
  let jobUrl = ""

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Job parser. Output JSON only: keys companyName, jobTitle, jobUrl. Use "" if unknown.',
        },
        { role: "user", content: textSlice },
      ],
    })
    const content = completion.choices[0]?.message?.content
    if (!content) {
      return json(502, { message: "Could not extract job data" })
    }
    const parsed = JSON.parse(content)
    companyName =
      typeof parsed.companyName === "string" ? parsed.companyName : ""
    jobTitle = typeof parsed.jobTitle === "string" ? parsed.jobTitle : ""
    jobUrl = typeof parsed.jobUrl === "string" ? parsed.jobUrl : ""
  } catch (e) {
    const msg = e instanceof Error ? e.message : "openai_error"
    console.log(
      JSON.stringify({ type: "smart-cache-openai-error", message: msg }),
    )
    return json(502, { message: "Could not extract job data" })
  }

  const existingRows = Array.isArray(boardRow.rows) ? boardRow.rows : []
  if (jobUrlAlreadyCached(existingRows, pageUrl, jobUrl)) {
    return json(409, { message: "Job already cached" })
  }

  const cellsRaw = mapExtractedToCells(columns, {
    companyName,
    jobTitle,
    jobUrl,
    pageUrl,
  })

  const normalized = normalizeCellsForBoard(columns, cellsRaw)
  if (!normalized.ok) {
    return json(400, { message: normalized.message ?? "Invalid cells" })
  }

  if (
    !normalized.cells ||
    !cellsHaveAtLeastOneNonWhitespaceValue(normalized.cells)
  ) {
    return json(400, {
      message: "Could not extract enough data for this board.",
    })
  }

  const rowId = randomUUID()
  const now = new Date().toISOString()
  const newEntry = {
    rowId,
    cells: normalized.cells,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({
          PK: pk,
          SK: `BOARD#${pathBoardId}`,
        }),
        UpdateExpression:
          "SET #rows = list_append(if_not_exists(#rows, :empty), :one), #updatedAt = :u",
        ExpressionAttributeNames: {
          "#rows": "rows",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: marshall({
          ":empty": [],
          ":one": [newEntry],
          ":u": now,
        }),
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      }),
    )
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      return json(404, { message: "Board not found" })
    }
    throw e
  }

  return json(201, {
    row: {
      id: rowId,
      cells: normalized.cells,
      createdAt: now,
      updatedAt: now,
    },
    updatedAt: now,
  })
}

module.exports = { handleSmartCache }
