export interface Product {
  id: string;
  name: string;
  desc: string;
  price: number;
  originalPrice: number;
  image: any;
  discount: string;
  category: string;
  rating: number;
  reviewsCount: number;
  variants: string[];
  features: { icon: string; label: string }[];
  bulletPoints: string[];
  specs: { label: string; value: string }[];
  reviews: { id: string; user: string; rating: number; title: string; text: string }[];
}

export const PRODUCTS: Product[] = [
  {
    id: 'car-tag-2',
    name: 'LinkNPark Car Parking Tag (Pack of 2)',
    desc: 'Allow people to contact you in case of urgency with parked car.',
    price: 399,
    originalPrice: 499,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    discount: '20%',
    category: 'Stickers',
    rating: 4.8,
    reviewsCount: 1234,
    variants: ['Car', 'Bike', 'CA/Doc'],
    features: [
      { icon: 'call', label: 'Masked Audio\nCalls' },
      { icon: 'logo-whatsapp', label: 'WhatsApp\nNotifications' },
      { icon: 'document-text', label: 'PDF Tag\n(Offline)' },
      { icon: 'videocam', label: 'Masked Video\nCalls' },
      { icon: 'return-up-back', label: 'Call Back\nCaller' },
      { icon: 'location', label: 'Check\nLocation' },
      { icon: 'chatbox-ellipses', label: 'Offline SMS\nAvailable' },
      { icon: 'headset', label: 'Live Support\nAlways' },
      { icon: 'warning', label: 'Emergency\nAlerts' },
    ],
    bulletPoints: [
      'Get updates about your parked vehicle on your phone, WhatsApp, and Masked Call.',
      'Manage your tag from the LinkNPark APP.',
      'One time purchase, COD Available.',
      'They can\'t see your phone number ⭐.',
      'Weather resistant and durable.',
      'High-quality QR code print.',
      'Works in all lighting conditions.'
    ],
    specs: [
      { label: 'Material', value: 'Premium Waterproof PVC' },
      { label: 'Size', value: 'Standard (fits all vehicles)' },
      { label: 'Warranty', value: '1 Year Replacement' }
    ],
    reviews: [
      {
        id: 'r1',
        user: 'Rahul K.',
        rating: 5,
        title: 'Great and responsive Product',
        text: 'Nice and easy to install/setup. People keep asking me where did you get it. Everyone finds it helpful.'
      },
      {
        id: 'r2',
        user: 'Suresh',
        rating: 5,
        title: 'LinkNPark is perfect name',
        text: 'This item is very good and useful to car owners. I like this item and highly recommend it.'
      }
    ]
  },
  {
    id: 'bike-tag-2',
    name: 'LinkNPark Bike Tags (Pack of 2)',
    desc: '1 for Bike, 1 for Helmet. Masked calls & WhatsApp.',
    price: 399,
    originalPrice: 499,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
    discount: '20%',
    category: 'Stickers',
    rating: 4.7,
    reviewsCount: 856,
    variants: ['Bike', 'Helmet'],
    features: [
      { icon: 'call', label: 'Masked Audio\nCalls' },
      { icon: 'logo-whatsapp', label: 'WhatsApp\nNotifications' },
      { icon: 'warning', label: 'Emergency\nAlerts' },
    ],
    bulletPoints: [
      'Get updates about your parked bike.',
      'One time purchase, lifetime validity.',
      'Weather resistant and durable.'
    ],
    specs: [
      { label: 'Material', value: 'Premium Waterproof PVC' },
      { label: 'Warranty', value: '1 Year Replacement' }
    ],
    reviews: []
  },
  {
    id: 'lost-found-pack',
    name: 'Lost & Found Tag (1 Ring + 4 Stickers)',
    desc: 'Use this tag on anything you dont want to lose.',
    price: 499,
    originalPrice: 999,
    image: require('../assets/lost_found_tags.png'),
    discount: '50%',
    category: 'Tags',
    rating: 4.9,
    reviewsCount: 342,
    variants: ['Keychain', 'Luggage', 'Laptop'],
    features: [
      { icon: 'location', label: 'Check\nLocation' },
      { icon: 'chatbox-ellipses', label: 'Offline SMS\nAvailable' },
    ],
    bulletPoints: [
      'Attach to keys, bags, or laptops.',
      'Finder can scan to return it without seeing your number.'
    ],
    specs: [
      { label: 'Material', value: 'Acrylic & PVC' },
    ],
    reviews: []
  },
  {
    id: 'pet-tag-1',
    name: 'LinkNPark Smart Pet Tag',
    desc: 'Never lose your furry friend. Anyone who finds them can scan the tag to contact you securely.',
    price: 399,
    originalPrice: 499,
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80',
    discount: '20%',
    category: 'Tags',
    rating: 4.9,
    reviewsCount: 412,
    variants: ['Dog', 'Cat'],
    features: [
      { icon: 'call', label: 'Masked Audio\nCalls' },
      { icon: 'location', label: 'Check\nLocation' },
      { icon: 'logo-whatsapp', label: 'WhatsApp\nNotifications' },
    ],
    bulletPoints: [
      'Easily attaches to any collar.',
      'Finder can scan to return your pet without seeing your number.',
      'Waterproof and durable for active pets.'
    ],
    specs: [
      { label: 'Material', value: 'Durable Metal & Epoxy' },
      { label: 'Warranty', value: '1 Year Replacement' }
    ],
    reviews: []
  }
];
