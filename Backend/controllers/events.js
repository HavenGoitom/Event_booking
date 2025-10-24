import path from 'path';
import { CreateEvent, getAllEvents, getEventsByOrganiser, getEventsByUser } from '../DataBaseManipulation.js';
import { prisma, } from '../prismaClient.js';

//gets all events
export const getEvents = async (req,res) => {
  try {
    const events = await getAllEvents()

    if (!events || events.length === 0) {
      return res.status(404).json({ message: 'No events found!!!' });
    }

    return res.status(200).json({
      message: 'Events fetched successfully',
      data: events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}


//creates an event for organizer only.

export const createEvent = async (req, res) => {
  try {
    const {
      email,
      name,
      description,
      LocationOfEvent,
      AvailableTicketsNormal,
      AvailableTicketsVip,
      priceNormal, 
      priceVip,
      eventPhoto,
    } = req.body;
    console.log(req.body);

    if (
      !email ||
      !name ||
      !description ||
      !LocationOfEvent ||
      !AvailableTicketsNormal  ||
      !AvailableTicketsVip  ||
      !priceNormal ||
      !priceVip) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!req.file) {
    return res.status(400).json({ message: 'Missing event photo' });
}
    const organiser = await prisma.organiser.findUnique({ where: { email } });
    if (!organiser) return res.status(404).json({ message: 'Organizer not found' });
    const organiserId = organiser.id;

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
      AvailableTicketsNormal: AvailableTicketsNormal,
      AvailableTicketsVip: AvailableTicketsVip,
      priceNormal: priceNormal,
      priceVip: priceVip,
      organiserId: organiserId,
      advertismentImage: picturePath,
    });

    // If we saved a picturePath, build its public URL; otherwise null
    const fullUrl = picturePath ? `${req.protocol}://${req.get('host')}${picturePath}` : null;

    return res.status(201).json({ message: "created", url: fullUrl, event: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Displays events the user has booked so far and the events the organizer has organized so far.

export const myEvents = async (req, res) => {
  try {
    const { role, email } = req.body; 

    if (!role || !email) {
      return res.status(400).json({ 
        message: 'Missing required URL parameters: role and email are required' 
      });
    }
    
    if (role === 'org') {
      // events the organiser created
      const organiser = await prisma.organiser.findUnique({where: {email: email}})
      if(!organiser) return   res.status(404).json({message: 'email is not correct'})   
      const events = await getEventsByOrganiser(organiser.id)
      if (!events || events.length === 0) return res.status(404).json({ message: 'No events found' });
      return res.status(200).json(events);

    } else if (role === 'user') {
      // events the user booked 
      const user = await prisma.user.findUnique({where: {email: email}})
      if(!user) return   res.status(404).json({message: 'email is not correct'})   
      const userEvents = await getEventsByUser(user.id)
      if (!userEvents || !userEvents.length === 0) return res.status(404).json({ message: 'No booked events found' });
      return res.status(200).json(userEvents);

    } else {
      return res.status(400).json({ message: 'Role is not supported' });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// books an event.

export const bookEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    // 1) check event and available tickets
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, AvailableTickets: true }
    });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.AvailableTicketsVip <= 0 ) return res.status(400).json({ message: 'Event sold out' });

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
