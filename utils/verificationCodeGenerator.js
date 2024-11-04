import crypto from "crypto";

const verificationCodeAndExpiration = () => {
  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const codeExpiration = Date.now() + 1 * 60 * 60 * 1000;

  return { verificationCode, codeExpiration };
};

export default verificationCodeAndExpiration;
