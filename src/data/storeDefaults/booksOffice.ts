// src/data/storeDefaults/booksOffice.ts
import { it, u, type CategoryDefaults } from './types';

const BOOKS_OFFICE_ITEMS = [
  it(1, 'Notebook A5 (Ruled)', 149, u('1531346878377-a5be20888e57'), '200 pages, hardcover'),
  it(2, 'Fountain Pen', 499, u('1583485088034-697b5bc54ccd'), 'Medium nib, refillable', {
    customizationOptions: [
      {
        name: 'Ink Color',
        choices: [
          { name: 'Blue', price: 0 },
          { name: 'Black', price: 0 },
          { name: 'Green', price: 0 },
        ],
        default: 'Blue',
      },
    ],
  }),
  it(3, 'Gel Pen Set (10 pcs)', 199, u('1583485088034-697b5bc54ccd'), 'Assorted colors, 0.5mm'),
  it(4, 'Highlighter Set (6 pcs)', 249, u('1583485088034-697b5bc54ccd'), 'Pastel and neon shades'),
  it(5, 'Sticky Notes (Pack of 5)', 129, u('1531346878377-a5be20888e57'), 'Assorted colors, 3x3 inch'),
  it(6, 'Desk Organizer', 899, u('1544716278-ca5e3f4abd8c'), 'Multi-compartment, wooden'),
  it(7, 'File Folder (Pack of 10)', 349, u('1568667256549-094345857637'), 'A4 size, plastic'),
  it(8, 'Stapler + Staples', 399, u('1587829741301-dc798b83add3'), 'Full-strip, includes 1000 staples'),
  it(9, 'Scissors', 199, u('1587829741301-dc798b83add3'), 'Stainless steel, 8 inch'),
  it(10, 'Whiteboard 2x3 ft', 1499, u('1587829741301-dc798b83add3'), 'Magnetic, with marker tray'),
  it(11, 'Novel - Best Seller', 399, u('1544947950-fa07a98d237f'), 'Assorted titles'),
  it(12, 'Non-Fiction Bestseller', 499, u('1512820790803-83ca734da794'), 'Assorted titles'),
  it(13, 'Children\'s Picture Book', 299, u('1503676260728-1c00da094a0b'), 'Ages 3-7, hardcover'),
  it(14, 'Cookbook - Indian', 799, u('1556910103-1c02745aae4d'), 'Regional recipes, illustrated'),
  it(15, 'Planner 2026', 599, u('1506784983877-45594efa4cbe'), 'Weekly, A5 size'),
  it(16, 'Kindle Paperwhite', 12999, u('1592496431122-2349e0f9ff7a'), '6.8", 16GB, waterproof'),
];

export const BOOKS_OFFICE_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80&auto=format&fit=crop',
  items: BOOKS_OFFICE_ITEMS,
};