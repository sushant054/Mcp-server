export class TourParser {
  static extractTourId(message: string): string | null {
    const tourIdMatch = message.match(/([a-f0-9-]{36})/i);
    return tourIdMatch ? tourIdMatch[1] : null;
  }

  static extractSpecificTourInfo(tourData: any, query: string): string {
    const lowerQuery = query.toLowerCase();
    
    let tourInfo;
    try {
      tourInfo = typeof tourData === 'string' ? JSON.parse(tourData) : tourData;
    } catch (e) {
      // Handle string-based tour data
      if (typeof tourData === 'string') {
        return this.parseStringTourData(tourData, lowerQuery);
      }
      return "I couldn't parse the tour details.";
    }
    
    // Handle JSON/object tour data
    try {
      if (lowerQuery.includes('guest') || lowerQuery.includes('passenger') || 
          (lowerQuery.includes('who') && lowerQuery.includes('tour'))) {
        return this.extractGuestInfo(tourInfo);
      }
      
      if (lowerQuery.includes('client') && (lowerQuery.includes('name') || lowerQuery.includes('who'))) {
        return this.extractClientInfo(tourInfo);
      }
      
      return typeof tourData === 'string' ? tourData : JSON.stringify(tourData, null, 2);
    } catch (e) {
      console.error('Error in extractSpecificTourInfo:', e);
      return typeof tourData === 'string' ? tourData : JSON.stringify(tourData, null, 2);
    }
  }

  private static parseStringTourData(tourData: string, lowerQuery: string): string {
    // Enhanced guest extraction for string data
    if (lowerQuery.includes('guest') || lowerQuery.includes('passenger') || 
        (lowerQuery.includes('who') && lowerQuery.includes('tour'))) {
      
      // Try multiple patterns for guest information
      const guestPatterns = [
        /guests?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        /passenger[s]?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        /traveller[s]?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        /client[:\s]*([^\n]+)/i
      ];
      
      for (const pattern of guestPatterns) {
        const match = tourData.match(pattern);
        if (match) {
          const section = match[1];
          
          // Extract names from the section
          const namePatterns = [
            /name[:\s]*([^\n,]+)/gi,
            /([A-Z][a-z]+\s+[A-Z][a-z]+)/g, // Full names like "John Doe"
            /"([^"]+)"/g, // Quoted names
            /:\s*([A-Z][a-z\s]+)(?=,|\n|$)/g // Names after colons
          ];
          
          const foundNames = new Set<string>();
          
          for (const namePattern of namePatterns) {
            const nameMatches = section.match(namePattern);
            if (nameMatches) {
              nameMatches.forEach(match => {
                const cleanName = match.replace(/name[:\s]*/i, '').replace(/[":,]/g, '').trim();
                if (cleanName.length > 2 && !cleanName.toLowerCase().includes('guest')) {
                  foundNames.add(cleanName);
                }
              });
            }
          }
          
          if (foundNames.size > 0) {
            const namesList = Array.from(foundNames);
            return `Guests:\n${namesList.map((name, index) => `${index + 1}. ${name}`).join('\n')}`;
          }
        }
      }
      
      return "Guest information format not recognized. Please check the raw tour data.";
    }
    
    // Handle client name extraction for string data
    if (lowerQuery.includes('client') && (lowerQuery.includes('name') || lowerQuery.includes('who'))) {
      const clientMatch = tourData.match(/client[:\s]*([^\n]+)/i);
      return clientMatch ? `Client Name: ${clientMatch[1].trim()}` : 
             "I couldn't find the client name in the tour details.";
    }
    
    return tourData;
  }

  private static extractGuestInfo(tourInfo: any): string {
    // Check multiple possible guest data structures
    const guestSources = [
      tourInfo.guests,
      tourInfo.passengers, 
      tourInfo.travellers,
      tourInfo.data?.guests,
      tourInfo.data?.passengers,
      tourInfo.guestList,
      tourInfo.bookingDetails?.guests
    ];
    
    for (const guestSource of guestSources) {
      if (guestSource && Array.isArray(guestSource) && guestSource.length > 0) {
        const guestInfo = guestSource.map((guest: any, index: number) => {
          // Handle different guest object structures
          if (typeof guest === 'string') {
            return `${index + 1}. ${guest}`;
          }
          
          if (guest.name) {
            return `${index + 1}. ${guest.name}`;
          }
          
          if (guest.firstName && guest.lastName) {
            return `${index + 1}. ${guest.firstName} ${guest.lastName}`;
          }
          
          if (guest.firstName) {
            return `${index + 1}. ${guest.firstName}`;
          }
          
          if (guest.guestName) {
            return `${index + 1}. ${guest.guestName}`;
          }
          
          if (guest.passengerName) {
            return `${index + 1}. ${guest.passengerName}`;
          }
          
          // Fallback to any string-like property
          const possibleNameFields = ['displayName', 'fullName', 'title'];
          for (const field of possibleNameFields) {
            if (guest[field]) {
              return `${index + 1}. ${guest[field]}`;
            }
          }
          
          return `${index + 1}. Guest ID: ${guest.id || guest._id || 'Unknown'}`;
        }).filter(Boolean);
        
        if (guestInfo.length > 0) {
          return `Guests (${guestInfo.length} found):\n${guestInfo.join('\n')}`;
        }
      }
    }
    
    // If no guest array found, check for single guest object
    const singleGuestSources = [
      tourInfo.guest,
      tourInfo.primaryGuest,
      tourInfo.data?.guest,
      tourInfo.client // Sometimes client info is used as guest info
    ];
    
    for (const guestSource of singleGuestSources) {
      if (guestSource && typeof guestSource === 'object') {
        const name = guestSource.name || 
                     `${guestSource.firstName || ''} ${guestSource.lastName || ''}`.trim() ||
                     guestSource.guestName ||
                     guestSource.displayName;
        
        if (name) {
          return `Guest: ${name}`;
        }
      }
    }
    
    // Debug info - show available fields
    const availableFields = Object.keys(tourInfo);
    return `No guest information found. Available fields: ${availableFields.join(', ')}\n\nPlease check the tour data structure or contact support.`;
  }

  private static extractClientInfo(tourInfo: any): string {
    const clientName = tourInfo.client?.name || 
                      tourInfo.clientName || 
                      tourInfo.data?.client?.name ||
                      tourInfo.data?.clientName;
    
    return clientName ? `Client Name: ${clientName}` : "Client name not available in tour data.";
  }
}