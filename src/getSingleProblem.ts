console.time("실행 시간");

import readlineSync from "readline-sync";
import fs from "fs";
import getDetails from "./getDetails";
import { BASE_URL, FILE_PATH, SOLUTION_EXTENSION } from "../env";
import { Problem } from ".";
import getImg from "./getImg";

export interface CreateSingleProblemResult {
  created: { solution: number; txt: number; img: number };
  success: number;
  fail: number;
  errorList: Array<{ problemData: Problem | null; error: any }>;
}

const getSingleProblem = async () => {
  console.log(fs.readFileSync("./rarebeef.txt").toString());

  const id = readlineSync.question("불러올 문제의 id를 입력해 주세요. >>> ");

  console.log(`\nid:${id} 문제를 불러옵니다.`);

  const result: CreateSingleProblemResult = {
    created: { solution: 0, txt: 0, img: 0 },
    success: 0,
    fail: 0,
    errorList: [],
  };

  console.log(`\n[id:${id}]의 세부 정보 다운로드 중...`);

  await getDetails(id)
    .then(async (details) => {
      console.log(
        `[id:${id}]의 세부 정보 다운로드 완료\n\n[id:${id}] 문제의 제목은 [${details.title}] 입니다.\n`,
      );

      console.log(`[${details.title}] 폴더 생성 중...`);
      await fs.promises
        .mkdir(`${FILE_PATH}/${details.title}`, {
          recursive: true,
        })
        .then(() => {
          result.success += 1;
          console.log(`[${details.title}] 폴더 생성 완료`);
        })
        .catch((error) => {
          result.fail += 1;
          result.errorList.push({
            problemData: { step: null, id, title: details.title },
            error,
          });
          console.log(`폴더 생성 에러: ${error.message}`);
        });

      try {
        const dir = `${FILE_PATH}/${details.title}`;
        let fileContent = `url: ${BASE_URL}/problem/${id}\n\nid: ${id}\n\ntitle: ${details.title}\n\ndescription:\n${details.description}\n\ninput:\n${details.input}\n\noutput:\n${details.output}\n\nsample input / output: 경로 내 txt 확인`;

        // 이미지 다운로드
        if (details.imgs.length === 0) {
          fileContent += "\n\n이미지 여부: false\n\n";
        } else {
          fileContent += "\n\n이미지 여부: true";
          console.log(`[${details.title}] 이미지 다운로드 중...`);
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
                  `[${details.title}] 이미지 다운로드 에러: ${error} : ${src}`,
                );
                fileContent += `\n\n이미지 다운로드 실패\n\n원본 이미지 경로를 통해 확인하세요.\n\n${src}`;
                result.errorList.push({
                  problemData: { step: null, id, title: details.title },
                  error: error,
                });
              });
          }
          console.log(`[${details.title}] 이미지 다운로드 완료`);
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
        console.log(`[${details.title}] 문제 생성 완료`);
      } catch (error: any) {
        result.fail += 1;
        result.errorList.push({
          problemData: { step: null, id, title: details.title },
          error,
        });
        console.log(`문제 파일 생성 에러: ${error}`);
      }
    })
    .catch((error) => {
      result.fail += 1;
      result.errorList.push({
        problemData: { step: null, id, title: "" },
        error,
      });
      console.log(`문제 세부 정보 다운로드 에러: ${error}`);
    });

  try {
    await fs.promises.mkdir(`./logs`, {
      recursive: true,
    });
    await fs.promises.writeFile(
      `./logs/log ${Date.now()}.txt`,
      `${new Date()}\n\n${JSON.stringify(result)}`,
    );
  } catch (error) {
    console.log(`로그 파일 생성 중 에러가 발생하였습니다. : ${error}`);
  }

  console.log(
    `\n\n\nid를 통해 1개의 문제를 불러왔습니다.\n\n불러오는 과정에서 ${result.created.solution}개의 ${SOLUTION_EXTENSION} 파일과 ${result.created.txt}개의 텍스트 파일, 그리고 ${result.created.img}개의 이미지 파일을 생성하였습니다.\n\n발생한 에러는 ${result.errorList.length}개이며 자세한 내용은 로그 파일에서 확인하실 수 있습니다.\n\n`,
  );

  console.timeEnd("실행 시간");
  console.log("\n\n");
  process.exit();
};

getSingleProblem();
