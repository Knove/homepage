export interface Project {
  name: string;
  year: string;
  description: string;
  stack: string;
  href: string;
}

export const PROJECTS: Project[] = [
  {
    name: "Gaokao-Bench",
    year: "2026",
    description: "以真实高考卷面为基础的 AI 推理评测。",
    stack: "Python / Benchmark",
    href: "https://github.com/Knove/Gaokao-Bench",
  },
  {
    name: "Alpha-Gomoku",
    year: "2026",
    description: "在五子棋上复刻 AlphaZero 的自我对弈训练循环。",
    stack: "Python / TypeScript",
    href: "https://github.com/Knove/alpha-gomoku",
  },
  {
    name: "knDB",
    year: "2019",
    description: "为轻量 Node.js 应用准备的本地数据持久化工具。",
    stack: "Node.js / npm",
    href: "https://github.com/Knove/knDB",
  },
];

export const PROJECT_INDEX_URL = "https://github.com/Knove";
