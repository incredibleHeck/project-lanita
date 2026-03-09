-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#6366f1',
ADD COLUMN "isExaminable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isSingleResource" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requiredRoomId" UUID,
ADD COLUMN "requiredRoomType" "RoomType",
ADD COLUMN "preferredRoomIds" JSONB;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN "defaultRoomId" UUID;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_requiredRoomId_fkey" FOREIGN KEY ("requiredRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_defaultRoomId_fkey" FOREIGN KEY ("defaultRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
