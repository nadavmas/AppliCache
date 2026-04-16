const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb")
const { marshall } = require("@aws-sdk/util-dynamodb")

const client = new DynamoDBClient({})

/**
 * Cognito Post Confirmation trigger — persists user profile to single-table DynamoDB.
 * PK = USER#<sub>, SK = PROFILE#<sub>
 */
exports.handler = async (event) => {
  const tableName = process.env.TABLE_NAME
  if (!tableName) {
    throw new Error("TABLE_NAME environment variable is required")
  }

  const attrs = event.request?.userAttributes
  const sub = attrs?.sub
  if (!sub) {
    console.error("PostConfirmation: missing sub", JSON.stringify(event))
    throw new Error("Missing sub in userAttributes")
  }

  const username = event.userName != null ? String(event.userName) : ""

  const item = {
    PK: `USER#${sub}`,
    SK: `PROFILE#${sub}`,
    sub,
    email: attrs.email ?? "",
    given_name: attrs.given_name ?? "",
    family_name: attrs.family_name ?? "",
    birthdate: attrs.birthdate ?? "",
    username,
    createdAt: new Date().toISOString(),
  }

  await client.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(item),
    }),
  )

  return event
}
