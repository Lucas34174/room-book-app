-- CreateEnum
CREATE TYPE "MergeRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "merge_requests" (
    "merge_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "existing_booking_id" INTEGER NOT NULL,
    "new_period_id" INTEGER NOT NULL,
    "booking_date" DATE NOT NULL,
    "merged_start_time" TIME NOT NULL,
    "merged_end_time" TIME NOT NULL,
    "booking_reason" TEXT NOT NULL,
    "status" "MergeRequestStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" INTEGER,
    "rejection_reason" TEXT,

    CONSTRAINT "merge_requests_pkey" PRIMARY KEY ("merge_id")
);

-- AddForeignKey
ALTER TABLE "merge_requests" ADD CONSTRAINT "merge_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_requests" ADD CONSTRAINT "merge_requests_existing_booking_id_fkey" FOREIGN KEY ("existing_booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_requests" ADD CONSTRAINT "merge_requests_new_period_id_fkey" FOREIGN KEY ("new_period_id") REFERENCES "periods"("period_id") ON DELETE RESTRICT ON UPDATE CASCADE;
