import { Restaurant } from './types';

export const APP_NAME = "YallaFtar";
export const OTHER_RESTAURANT_ID = 'other_custom';

export const DEFAULT_RESTAURANT: Restaurant = {
  id: 'default_01',
  name: 'Sunrise Café (Default)',
  menu: [
    {
      id: '1',
      name: 'Classic Breakfast Burrito',
      category: 'Mains',
      price: 12.50,
      description: 'Scrambled eggs, cheese, potatoes, and salsa in a flour tortilla.'
    },
    {
      id: '2',
      name: 'Avocado Toast',
      category: 'Mains',
      price: 14.00,
      description: 'Sourdough, smashed avocado, radish, chili flakes, and microgreens.'
    },
    {
      id: '3',
      name: 'Bagel with Cream Cheese',
      category: 'Mains',
      price: 5.50,
      description: 'Toasted everything bagel with plain whipped cream cheese.'
    },
    {
      id: '4',
      name: 'Greek Yogurt Parfait',
      category: 'Sides',
      price: 8.00,
      description: 'Vanilla greek yogurt, granola, and seasonal berries.'
    },
    {
      id: '5',
      name: 'Hash Brown Patty',
      category: 'Sides',
      price: 3.00,
      description: 'Crispy golden potato patty.'
    },
    {
      id: '6',
      name: 'Cold Brew Coffee',
      category: 'Drinks',
      price: 4.50,
      description: 'Steeped for 12 hours, smooth and bold.'
    },
    {
      id: '7',
      name: 'Orange Juice',
      category: 'Drinks',
      price: 4.00,
      description: 'Freshly squeezed.'
    },
    {
      id: '8',
      name: 'Oat Milk Latte',
      category: 'Drinks',
      price: 5.50,
      description: 'Espresso with steamed oat milk.'
    }
  ]
};