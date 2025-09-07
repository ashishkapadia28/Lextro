/*
  Warnings:

  - Added the required column `answerType` to the `Query` table without a default value. This is not possible if the table is not empty.
  - Added the required column `explanationLanguage` to the `Query` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Query" ADD COLUMN     "answerType" TEXT NOT NULL,
ADD COLUMN     "explanationLanguage" TEXT NOT NULL;
