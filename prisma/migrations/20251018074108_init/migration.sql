-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organiser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "DescriptionAboutCompany" TEXT NOT NULL,
    "LocatedAt" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Organiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "LocationOfEvent" TEXT NOT NULL,
    "AvailableTickets" INTEGER NOT NULL,
    "priceNormal" INTEGER NOT NULL,
    "priceVip" INTEGER NOT NULL,
    "organiserId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertisementForEvent" (
    "id" TEXT NOT NULL,
    "advertisement_images" TEXT NOT NULL,
    "advertisement_videos" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "AdvertisementForEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profilePicture" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "picture" TEXT NOT NULL,

    CONSTRAINT "profilePicture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_eventPeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_eventPeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organiser_merchantId_key" ON "Organiser"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Organiser_email_key" ON "Organiser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdvertisementForEvent_eventId_key" ON "AdvertisementForEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "profilePicture_organisationId_key" ON "profilePicture"("organisationId");

-- CreateIndex
CREATE INDEX "_eventPeople_B_index" ON "_eventPeople"("B");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertisementForEvent" ADD CONSTRAINT "AdvertisementForEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilePicture" ADD CONSTRAINT "profilePicture_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventPeople" ADD CONSTRAINT "_eventPeople_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventPeople" ADD CONSTRAINT "_eventPeople_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
