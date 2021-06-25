import { validationResult } from "express-validator";

const validationMiddleware = (req, res, next) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    //if no error then only return json data
    return res.json({
      errors: errors.array(),
    });
  }
  next();
};

export default validationMiddleware;
