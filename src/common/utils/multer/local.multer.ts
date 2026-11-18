import { fileTypeFromBuffer } from "file-type";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BadRequestException } from "../../exception";
import { Request } from "express";
import { StorageApproachEnum } from "../../enum";
import { tmpdir } from "node:os";

export const fileTypeValidation = {
  images: ["image/jpeg", "image/png", "image/gif"],
  files: ["application/pdf", "application/json"],
};

export const localFileUpload = ({
  maxFileSize = 5,
  storageApproach = StorageApproachEnum.MEMORY,
}: {
  maxFileSize?: number;
  storageApproach?: StorageApproachEnum;
}) => {
  const storage = StorageApproachEnum.MEMORY
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination(req, file, callback) {
          callback(null, tmpdir());
        },
        filename(req, file, callback) {
          callback(null, randomUUID() + file.originalname);
        },
      });

  return multer({
    storage,
    limits: { fileSize: maxFileSize * 1024 * 1024 },
  });
};

export const processFile = async ({
  customPath = "general",
  file,
  validation,
}: {
  customPath?: string;
  file: Express.Multer.File;
  validation: string[];
}) => {
  if (file.path) {
    file.buffer = await readFile(file.path);
  }

  const result = await fileTypeFromBuffer(file.buffer);
  if (!result || !validation.includes(result.mime)) {
    await unlink(file.path);
    throw new BadRequestException("Invalid attachment format.");
  } else {
    await mkdir(resolve(`./assets/${customPath}`), { recursive: true });
    const uniqueFilePath = `assets/${customPath}/${randomUUID()}.${result.ext}`;
    await writeFile(resolve(`./${uniqueFilePath}`), file.buffer);
    if (file.path) {
      await unlink(file.path);
    }
    file.path = uniqueFilePath;
    return file;
  }
};

const validateFiles = async ({
  files = [],
  validation = [],
}: {
  files: Express.Multer.File[];
  validation: string[];
}) => {
  for (const file of files) {
    const result = await fileTypeFromBuffer(file.buffer);
    if (!result || !validation.includes(result.mime)) {
      throw new BadRequestException("Invalid attachment format.");
    }
  }
};

export const processFiles = async ({
  customPath = "general",
  files,
  validation,
}: {
  customPath: string;
  files: Express.Multer.File[];
  validation: string[];
}) => {
  await validateFiles({ files, validation });

  const assets = [];
  for (const file of files) {
    const uploadFile = await processFile({ customPath, file, validation });
    assets.push(uploadFile);
  }

  return assets;
};

export const processFields = async ({
  customPath = "general",
  fields,
  validation,
}: {
  customPath: string;
  fields: Record<string, Express.Multer.File[]>;
  validation: string[];
}) => {
  await validateFiles({ files: Object.values(fields).flat(), validation });

  const assets = [];
  for (const field of Object.keys(fields)) {
    const files = await processFiles({
      customPath,
      files: fields[field] as Express.Multer.File[],
      validation,
    });
    assets.push({ field, files });
  }

  return assets;
};

export const processMulterUpload = async ({
  req,
  customPath = "general",
  validation = [],
}: {
  req: Request;
  customPath: string;
  validation: string[];
}) => {
  if (req.file) {
    await processFile({ customPath, file: req.file, validation });
  } else if (Array.isArray(req.files)) {
    await processFiles({ customPath, files: req.files, validation });
  } else if (typeof req.files == "object" && Object.keys(req.files)?.length) {
    await processFields({ customPath, fields: req.files, validation });
  }
};
