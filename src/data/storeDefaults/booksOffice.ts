// src/data/storeDefaults/booksOffice.ts
import { it, u, type CategoryDefaults } from './types';

const BOOKS_OFFICE_ITEMS = [
  it(1, 'Notebook A5 (Ruled)', 149, u('nootebook.webp'), '200 pages, hardcover'),
  it(2, 'Fountain Pen', 499, u('pen.webp'), 'Medium nib, refillable', {
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
  it(3, 'Gel Pen Set (10 pcs)', 199, u('pen.webp'), 'Assorted colors, 0.5mm'),
  it(4, 'Highlighter Set (6 pcs)', 249, u('boook-glass.webp'), 'Pastel and neon shades'),
  it(5, 'Sticky Notes (Pack of 5)', 129, u('nootebook.webp'), 'Assorted colors, 3x3 inch'),
  it(6, 'Desk Organizer', 899, u('calender-cup.webp'), 'Multi-compartment, wooden'),
  it(7, 'File Folder (Pack of 10)', 349, u('books.webp'), 'A4 size, plastic'),
  it(8, 'Stapler + Staples', 399, u('payment-counter.webp'), 'Full-strip, includes 1000 staples'),
  it(9, 'Scissors', 199, u('hammer.webp'), 'Stainless steel, 8 inch'),
  it(10, 'Whiteboard 2x3 ft', 1499, u('meeting.webp'), 'Magnetic, with marker tray'),
  it(11, 'Novel - Best Seller', 399, u('book-mandh.webp'), 'Assorted titles'),
  it(12, 'Non-Fiction Bestseller', 499, u('library.webp'), 'Assorted titles'),
  it(13, 'Children\'s Picture Book', 299, u('library-zoom.webp'), 'Ages 3-7, hardcover'),
  it(14, 'Cookbook - Indian', 799, u('cooking.webp'), 'Regional recipes, illustrated'),
  it(15, 'Planner 2026', 599, u('calender-cup.webp'), 'Weekly, A5 size'),
  it(16, 'Kindle Paperwhite', 12999, u('keyboard.webp'), '6.8", 16GB, waterproof'),
];

export const BOOKS_OFFICE_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/library.webp',
  items: BOOKS_OFFICE_ITEMS,
};