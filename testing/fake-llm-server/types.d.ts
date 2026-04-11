declare module "express" {
  const express: any;
  export type Request = any;
  export type Response = any;
  export default express;
}

declare module "cors" {
  const cors: any;
  export default cors;
}
