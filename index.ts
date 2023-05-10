console.time("실행 시간");

import fs from "fs";
import _path from "path";
import createStepFolders from "./src/createStepFolders";
import createProblems from "./src/createProblems";
import { SOLUTION_EXTENSION } from "./env";

export interface SampleInOutPut {
  input: string;
  output: string;
}

export interface Problem {
  step: string;
  id: string;
  title: string;
}

export interface ProblemDetails {
  description: string;
  input: string;
  output: string;
  samples: Array<SampleInOutPut>;
  imgs: Array<string>;
}

export interface Step {
  step: string;
  title: string;
  href: string;
  folderName: string;
}

export interface CreateStepResult {
  success: number;
  fail: number;
  errorList: Array<{ stepData: Step | null; error: any }>;
}

export interface CreateProblemsResult {
  created: { solution: number; txt: number; img: number };
  success: number;
  fail: number;
  errorList: Array<{ problemData: Problem | null; error: any }>;
}

export interface FinalResult {
  created: { solution: number; txt: number; img: number };
  success: {
    step: number;
    problem: number;
  };
  fail: { step: number; problem: number };
  errorList: {
    step: Array<{ stepData: Step | null; error: any }>;
    problem: Array<{ problemData: Problem | null; error: any }>;
  };
}

/**
 * 단계 폴더와 문제 파일을 생성하는 비동기 함수를 실행하고 최종 결과를 반환하는 비동기 함수
 * */
const getProblemsAndLogResult = async () => {
  const stepsResult: Array<CreateStepResult> = [];
  const promises: Array<Promise<CreateProblemsResult>> = [];

  // 단계 폴더 생성
  console.log(fs.readFileSync("./rarebeef.txt").toString());

  await createStepFolders().then(async (result) => {
    stepsResult.push(result.result);

    // 단계별 문제 파일 생성
    for (let i = 0; i < result.steps.length; i++) {
      promises.push(createProblems(result.steps[i]));
    }
  });

  const problemsResult = await Promise.all(promises);

  // 모든 문제 파일 생성이 완료되면 결과를 반환한다.
  return {
    problemsResult: problemsResult,
    stepsResult: stepsResult[0],
  };
};

getProblemsAndLogResult()
  .then(async (results) => {
    if (!results.stepsResult || results.stepsResult.success === 0) {
      console.log("유효 단계가 존재하지 않습니다.");
      return;
    } else if (!results.problemsResult) {
      console.log("유효 문제가 존재하지 않습니다.");
      return;
    }

    const finalResult: FinalResult = {
      created: { solution: 0, txt: 0, img: 0 },
      success: {
        step: 0,
        problem: 0,
      },
      fail: { step: 0, problem: 0 },
      errorList: {
        step: [],
        problem: [],
      },
    };

    const { problemsResult, stepsResult } = results;

    // 단계 결과 종합
    finalResult.success.step = stepsResult.success;
    finalResult.fail.step = stepsResult.fail;
    finalResult.errorList.step = stepsResult.errorList;

    // 문제 결과 종합
    problemsResult.forEach((result) => {
      const { created, success, fail, errorList } = result;
      finalResult.created.solution += created.solution;
      finalResult.created.txt += created.txt;
      finalResult.created.img += created.img;
      finalResult.success.problem += success;
      finalResult.fail.problem += fail;
      finalResult.errorList.problem.push(...errorList);
    });

    // 최종 결과 출력
    const { created, success, fail, errorList } = finalResult;
    try {
      await fs.promises.mkdir(`./logs`, {
        recursive: true,
      });
      await fs.promises.writeFile(
        `./logs/log ${Date.now()}.txt`,
        `${new Date()}\n\n${JSON.stringify(finalResult)}`,
      );
    } catch (error) {
      console.log(`로그 파일 생성 중 에러가 발생하였습니다. : ${error}`);
    }

    console.log(
      `\n\n\n${success.step}개의 단계에 속한 ${
        success.problem
      }개의 문제를 불러왔습니다.\n\n불러오는 과정에서 ${
        created.solution
      }개의 ${SOLUTION_EXTENSION} 파일과 ${
        created.txt
      }개의 텍스트 파일, 그리고 ${
        created.img
      }개의 이미지 파일을 생성하였습니다.\n\n발생한 에러는 ${
        errorList.step.length + errorList.problem.length
      }개이며 자세한 내용은 로그 파일에서 확인하실 수 있습니다.\n\n`,
    );
  })
  .catch((error) => {
    console.log(`Error: ${error}`);
  })
  .finally(() => {
    console.timeEnd("실행 시간");
    console.log("\n\n");
    process.exit();
  });
