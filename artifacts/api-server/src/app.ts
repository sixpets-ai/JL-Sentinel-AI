import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ errorType: error instanceof Error ? error.name : "unknown" }, "Request failed without leaking payload or connection data");
  const status = (error as { status?: number })?.status;
  res.status(status && status >= 400 && status <= 599 ? status : 500).json({
    error: status === 503 && error instanceof Error ? error.message : "Operación no confirmada. Revisa el estado antes de reintentar.",
  });
});

export default app;
