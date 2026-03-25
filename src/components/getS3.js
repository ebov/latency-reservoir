import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export async function getS3File(bucketName, key, profileName) {
  try {
    // Create an S3 client configured to use the specified profile
    const client = new S3Client({
      profile: profileName,
      region:'us-west-2'
    });

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(command);

    // Convert the Body (ReadableStream) to a string or buffer
    const fileContent = await response.Body.transformToString();
    // console.log("File content:", fileContent);
    return fileContent;
  } catch (err) {
    console.error("Error fetching file from S3:", err);
    throw err;
  }
}

export async function getS3Stream(bucketName, key, profileName) {
  try {
    // Create an S3 client configured to use the specified profile
    const client = new S3Client({
      profile: profileName,
      region:'us-west-2'
    });

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(command);

    // Convert the Body (ReadableStream) to a string or buffer
    const nodeStream = response.Body;
    return Readable.toWeb(nodeStream);
  } catch (err) {
    console.error("Error fetching file from S3:", err);
    throw err;
  }
}