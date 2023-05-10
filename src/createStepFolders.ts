import https from "https";
import cheerio from "cheerio";
import fs from "fs";
import _path from "path";
import { BASE_URL, FILE_PATH } from "../env";
import { Step, CreateStepResult } from "..";

/**
 * 모든 단계 폴더를 생성하고 단계들의 데이터와 결과를 반환하는 비동기 함수
 * */
const createStepFolders = (): Promise<{
  steps: Array<Step>;
  result: CreateStepResult;
}> => {
  return new Promise((resolve, reject) => {
    console.log(
      "\n\n//////////////////////////////////////////////////////////////////////\n//////////// 단계 폴더 생성을 시작합니다. ////////////\n//////////////////////////////////////////////////////////////////////\n\n",
    );
    const url = `${BASE_URL}/step`;
    const steps: Array<Step> = [];
    const result: CreateStepResult = {
      success: 0,
      fail: 0,
      errorList: [],
    };

    https
      .get(url, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", async () => {
          const $ = cheerio.load(body);

          // 단계 데이터 추출(유효성 검증)
          $(".table-responsive a").each((i: number, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr("href");
            const step = $(el).parent().prev().text().trim();

            if (!title || !href || !step) {
              const error = new Error("필수 파라미터가 존재하지 않습니다.");
              console.log(`Error: ${error.message}`);
              result.fail += 1;
              result.errorList.push({
                stepData: steps[i],
                error,
              });
              reject(error);
              return;
            } else {
              const folderName = `${step}. ${title}`;
              steps.push({ step, title, href, folderName });
            }
          });

          // 단계 폴더 생성
          for (let i = 0; i < steps.length; i++) {
            const { folderName } = steps[i];
            await fs.promises
              .mkdir(`${FILE_PATH}/${folderName}`, {
                recursive: true,
              })
              .then(() => {
                result.success += 1;
                console.log(`[${folderName}] 폴더 생성 완료`);
              })
              .catch((error) => {
                result.fail += 1;
                result.errorList.push({
                  stepData: steps[i],
                  error,
                });
                console.log(`단계 폴더 생성 에러: ${error.message}`);
              });
          }
          console.log(
            "\n\n////////////////////////////////////////////////////////////////////////////\n//////////// 단계 폴더 생성이 완료되었습니다. ////////////\n////////////////////////////////////////////////////////////////////////////\n\n\n\n/////////////////////////////////////////////////////////////////\n//////////// 문제 파일 생성을 시작합니다. ////////////\n/////////////////////////////////////////////////////////////////\n\n",
          );
          resolve({ steps, result });
        });
      })
      .on("error", (error: Error) => {
        console.log(`Error: ${error.message}`);
        reject(error);
      });
  });
};

export default createStepFolders;
