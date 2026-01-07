export const isValidDate = (d: any) => {
    const date = new Date(d);
    return !isNaN(date.getTime());
  }
  