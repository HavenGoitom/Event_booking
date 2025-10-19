import path from 'path';
import { CreateEvent, GivenEventIdSelectEvent } from '../../DataBaseManipulation.js';
import { prisma, } from '../../prismaClient.js';

/*
{
    "id": "2a71c1c7-51fa-4e73-8d56-9f331f2cb0d2",
    "name": "Music Festival 2025",
    "description": "An amazing night of live music!",
    "LocationOfEvent": "Addis Ababa",
    "AvailableTickets": 250,
    "priceNormal": 300,
    "priceVip": 500,
    "organiserId": "b7a3b9f1-5f40-42a9-bd0a-4bb8e8f39a6f"
  },*/

// controllers/eventBookingController.js

export const bookEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // 1) check event and available tickets
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, AvailableTickets: true }
    });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.AvailableTickets <= 0) return res.status(400).json({ message: 'Event sold out' });

    // 2) check if user already booked (uses your many-to-many relation)
    const already = await prisma.user.findFirst({
      where: {
        id: userId,
        eventsBookedAndAttended: { some: { id: eventId } }
      },
      select: { id: true }
    });
    if (already) return res.status(400).json({ message: 'User already booked this event' });

    // 3) transaction: decrement tickets and connect user to event
    const [updatedEvent] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: {
          AvailableTickets: { decrement: 1 },
          peopleAttended: { connect: { id: userId } }
        },
        include: { organiser: true, advertisment: true }
      })
    ]);

    return res.status(200).json({ message: 'Booked successfully', event: updatedEvent });
  } catch (error) {
    console.error('Error booking event:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      LocationOfEvent,
      AvailableTickets,
      priceNormal,
      photo, 
      priceVip,
      organiserId,
      advertismentImage,
      advertismentVideo
    } = req.body;

    if (
      !name ||
      !description ||
      !LocationOfEvent ||
      AvailableTickets == null ||
      priceNormal == null ||
      priceVip == null ||
      !organiserId
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Only build filename/picturePath when a file was actually uploaded
    let picturePath = null;
    if (req.file) {
      const filename = req.file.filename ?? path.basename(req.file.path);
      picturePath = path.posix.join('/uploads', 'eventPhoto', filename);
    }

    const events = await CreateEvent({
      name: name,
      description: description,
      LocationOfEvent: LocationOfEvent,
      AvailableTickets: AvailableTickets,
      priceNormal: priceNormal,
      priceVip: priceVip,
      organiserId: organiserId,
      advertismentImage: picturePath,
      // advertismentVideo: advertismentVideo // keep if you later want videos
    });

    // If we saved a picturePath, build its public URL; otherwise null
    const fullUrl = picturePath ? `${req.protocol}://${req.get('host')}${picturePath}` : null;

    return res.status(201).json({ message: "created", url: fullUrl, event: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const myEvents = async (req, res) => {
  try {
    const { role, id } = req.params; // route must be /my/:role/:id

    if (role === 'org') {
      // events the organiser created
      const events = await prisma.event.findMany({
        where: { organiserId: id },
        include: { advertisment: true, peopleAttended: true }
      });
      if (!events || events.length === 0) return res.status(404).json({ message: 'No events found' });
      return res.status(200).json(events);

    } else if (role === 'user') {
      // events the user booked (via the many-to-many)
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          eventsBookedAndAttended: {
            include: { organiser: true, advertisment: true }
          }
        }
      });
      if (!user || !user.eventsBookedAndAttended.length) return res.status(404).json({ message: 'No booked events found' });
      return res.status(200).json(user.eventsBookedAndAttended);

    } else {
      return res.status(400).json({ message: 'Role is not supported' });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

