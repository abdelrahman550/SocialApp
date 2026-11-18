import cors from "cors";
import express from "express";
import { NotFoundException } from "./common/exception";
import { cacheService } from "./common/service";
import { PORT } from "./config";
import { bootstrapDB } from "./DB/connection.db";
import { FollowRequestModel, UserModel } from "./DB/models";
import { globalErrorHandling } from "./middleware";
import { authenticationController, userController } from "./modules";

const app: express.Application = express();

app.use(express.json(), cors());

app.all(
  "/",
  (req: express.Request, res: express.Response): express.Response => {
    return res.status(200).send({ message: `Welcome to Social-App's API` });
  },
);
app.use("/assets", express.static("./assets"));

app.use("/auth", authenticationController);
app.use("/users", userController);

app.all(
  "/{*path}",
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void => {
    next(new NotFoundException("Invalid app route"));
  },
);

app.use(globalErrorHandling);

async function bootstrap(): Promise<void> {
  try {
    await bootstrapDB();
    await cacheService.connect();

    await UserModel.syncIndexes();
    await FollowRequestModel.syncIndexes();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    server.on("error", (error: Error) => {
      console.error("HTTP server error:", error);
      process.exit(1);
    });
  } catch (error: unknown) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
}

void bootstrap();
