import { z } from "zod";
import { updateProfile } from "../user.validation";


export type UpdateProfileDto = z.infer<ReturnType<typeof updateProfile>>["body"];
