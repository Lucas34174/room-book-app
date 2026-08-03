/*
  Warnings:

  - You are about to drop the `merge_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "merge_requests" DROP CONSTRAINT "merge_requests_existing_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "merge_requests" DROP CONSTRAINT "merge_requests_new_period_id_fkey";

-- DropForeignKey
ALTER TABLE "merge_requests" DROP CONSTRAINT "merge_requests_user_id_fkey";

-- DropTable
DROP TABLE "merge_requests";

-- DropEnum
DROP TYPE "MergeRequestStatus";
