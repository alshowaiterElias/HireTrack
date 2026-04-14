-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "jobUrl" TEXT,
    "content" TEXT NOT NULL,
    "structured" TEXT,
    "keywords" TEXT[],
    "skills" TEXT[],
    "experience" TEXT[],
    "education" TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_descriptions_applicationId_key" ON "job_descriptions"("applicationId");

-- CreateIndex
CREATE INDEX "job_descriptions_userId_idx" ON "job_descriptions"("userId");

-- CreateIndex
CREATE INDEX "job_descriptions_companyName_idx" ON "job_descriptions"("companyName");

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
