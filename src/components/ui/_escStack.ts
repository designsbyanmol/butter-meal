// src/components/ui/_escStack.ts
export const escStack: string[] = [];

export const pushEsc = (id: string) => escStack.push(id);

export const popEsc = (id: string) => {
  const i = escStack.indexOf(id);
  if (i !== -1) escStack.splice(i, 1);
};

export const isTopEsc = (id: string): boolean =>
  escStack[escStack.length - 1] === id;