const chunkArray = (array: any[], size: number) => {
  const chunked_arr = [];
  for (let i = 0; i < array.length; i += size) {
    chunked_arr.push(array.slice(i, i + size));
  }
  return chunked_arr;
};

export default chunkArray;
