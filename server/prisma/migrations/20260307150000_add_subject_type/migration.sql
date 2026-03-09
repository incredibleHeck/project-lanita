-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('CORE', 'OPTIONAL', 'ELECTIVE');

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "subjectType" "SubjectType" NOT NULL DEFAULT 'CORE';

-- Update existing rows: set ELECTIVE where isElective is true
UPDATE "Subject" SET "subjectType" = 'ELECTIVE' WHERE "isElective" = true;
