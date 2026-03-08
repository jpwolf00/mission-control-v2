-- CreateTable
CREATE TABLE "story_attachments" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "local_path" TEXT NOT NULL,
    "google_drive_file_id" TEXT NOT NULL,
    "google_drive_url" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_attachments_story_id_idx" ON "story_attachments"("story_id");

-- AddForeignKey
ALTER TABLE "story_attachments" ADD CONSTRAINT "story_attachments_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
