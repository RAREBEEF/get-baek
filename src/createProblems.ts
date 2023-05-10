import https from "https";
import cheerio from "cheerio";
import fs from "fs";
import _path from "path";
import { BASE_URL, FILE_PATH, SOLUTION_EXTENSION } from "../env";
import getImg from "./getImg";
import { Step, CreateProblemsResult, Problem } from "..";
import getDetails from "./getDetails";

/**
 * 단계 데이터를 인자로 받아 해당 단계 문제들의 파일을 생성하고 생성 결과를 반환하는 비동기 함수
 * */
const createProblems = (step: Step): Promise<CreateProblemsResult> => {
  return new Promise((resolve, reject) => {
    const result: CreateProblemsResult = {
      created: { solution: 0, txt: 0, img: 0 },
      success: 0,
      fail: 0,
      errorList: [],
    };

    const { href, folderName } = step;
    const url = `${BASE_URL}${href}`;

    https
      .get(url, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", async () => {
          const $ = cheerio.load(body);
          const problems: Array<Problem> = [];

          $(".list_problem_id").each((i, el) => {
            const step = $(el).prev().text().trim();
            const id = $(el).text().trim();
            const title = $(el)
              .next()
              .find("a")
              .text()
              .trim()
              .replace(/\//g, "divide");

            problems.push({ step, id, title });
          });

          for (let i = 0; i < problems.length; i++) {
            try {
              const { step, id, title } = problems[i];
              const details = await getDetails(id);
              const problemName = `${step}. ${title}`;
              const dir = `${FILE_PATH}/${folderName}/${problemName}`;
              let fileContent = `url: ${BASE_URL}/problem/${id}\n\nstep: ${step}\n\nid: ${id}\n\ntitle: ${title}\n\ndescription:\n${details.description}\n\ninput:\n${details.input}\n\noutput:\n${details.output}\n\nsample input / output: 경로 내 txt 확인`;

              // 폴더 생성
              await fs.promises.mkdir(dir, {
                recursive: true,
              });

              // 이미지 다운로드
              if (details.imgs.length === 0) {
                fileContent += "\n\n이미지 여부: false\n\n";
              } else {
                fileContent += "\n\n이미지 여부: true";
                console.log(`[${problemName}] 이미지 다운로드 중...`);
                for (let i = 0; i < details.imgs.length; i++) {
                  const src = details.imgs[i].includes("https://")
                    ? details.imgs[i]
                    : BASE_URL + "/" + details.imgs[i];

                  await getImg(src, `${dir}/${i}`)
                    .then(() => {
                      fileContent += `\n\n원본 이미지 ${i}: ${src}`;
                      result.created.img += 1;
                    })
                    .catch((error) => {
                      console.log(
                        `[${problemName}] 이미지 다운로드 에러: ${error} : ${src}`,
                      );
                      fileContent += `\n\n이미지 다운로드 실패\n\n원본 이미지 경로를 통해 확인하세요.\n\n${src}`;
                      result.errorList.push({
                        problemData: problems[i],
                        error: error,
                      });
                    });
                }
                console.log(`[${problemName}] 이미지 다운로드 완료`);
              }

              // solution 파일 생성
              await fs.promises
                .writeFile(
                  `${dir}/solution${SOLUTION_EXTENSION}`,
                  fileContent.replace(/^/gm, "// "),
                )
                .then(() => {
                  result.created.solution += 1;
                });

              // 샘플 입출력 파일 생성
              for (let i = 0; i < details.samples.length; i++) {
                const sample = details.samples[i];
                await fs.promises
                  .writeFile(`${dir}/input${i + 1}.txt`, sample.input)
                  .then(() => {
                    result.created.txt += 1;
                  });
                await fs.promises
                  .writeFile(`${dir}/output${i + 1}.txt`, sample.output)
                  .then(() => {
                    result.created.txt += 1;
                  });
              }

              result.success += 1;
              console.log(`[${problemName}] 문제 생성 완료`);
            } catch (error: any) {
              result.fail += 1;
              result.errorList.push({ problemData: problems[i], error });
              console.log(`문제 파일 생성 에러: ${error}`);
              reject(error);
            }
          }

          resolve(result);
        });
      })
      .on("error", (error: Error) => {
        console.log(`Error: ${error.message}`);
        reject(error);
      });
  });
};

export default createProblems;
