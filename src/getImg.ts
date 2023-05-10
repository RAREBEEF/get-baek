import https from "https";
import _path from "path";
import fs from "fs";

const getImg = async (
  src: string,
  path: string,
): Promise<{ redirect: boolean; src: string }> => {
  return new Promise((resolve, reject) => {
    const result = { redirect: false, src };
    https
      .get(src, async (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          result.redirect = true;
          result.src = response.headers.location;
          await getImg(response.headers.location, path).then((newResult) => {
            result.redirect = newResult.redirect;
            result.src = newResult.src;
          });
        } else {
          const data: Array<any> = [];
          response.on("data", (chunk) => {
            data.push(chunk);
          });
          response.on("end", async () => {
            const buffer = Buffer.concat(data);
            const contentType = response.headers["content-type"];
            const extension =
              _path.extname(src).toLowerCase() ||
              "." + contentType?.split("/")[1];
            await fs.promises.writeFile(path + extension, buffer);
          });
        }

        resolve(result);
      })
      .on("error", (error: Error) => {
        console.log(`Error: ${error.message}`);
        reject(error);
      });
  });
};

export default getImg;
