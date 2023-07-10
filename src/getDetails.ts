import { BASE_URL } from "../env";
import { ProblemDetails, SampleInOutPut } from "..";
import https from "https";
import cheerio from "cheerio";
import _path from "path";

/**
 * 문제의 id를 인자 받아서 해당 문제의 설명, 입출력 조건과 입출력 샘플 등의 디테일을 반환하는 비동기 함수
 * */
const getDetails = (id: string): Promise<ProblemDetails> => {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/problem/${id}`;

    https
      .get(url, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          const $ = cheerio.load(body);
          const title = $("#problem_title").text();
          const problemBody = $("#problem-body");
          const description = problemBody
            .find("#problem_description")
            .text()
            .trim();
          const input = problemBody.find("#problem_input").text();
          const output = problemBody.find("#problem_output").text();
          const samples: Array<SampleInOutPut> = [];
          const imgs: Array<string> = [];

          $("[id*=sample-input]").each((i: number, el) => {
            const input = $(el).text();
            const output = $(el)
              .parent()
              .parent()
              .next()
              .find("[id*=sample-output]")
              .text();
            samples[i] = { input, output };
          });

          problemBody
            .find("#problem_description")
            .find("img")
            .each((i: number, el) => {
              const src = $(el).attr("src");
              if (!src) {
                return;
              } else {
                imgs.push(src);
              }
            });

          resolve({
            title,
            description,
            input,
            output,
            samples,
            imgs,
          });
        });
      })
      .on("error", (error: Error) => {
        console.log(`Error: ${error.message}`);
        reject(error);
      });
  });
};

export default getDetails;
