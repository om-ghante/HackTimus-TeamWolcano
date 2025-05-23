import { useState, useMemo } from "react";
import { useGlobalStore } from "fdk-core/utils";
import { useLocation } from "react-router-dom";
import { useAccounts, useThemeConfig } from "../../helper/hooks";
import useLoginOtp from "./useLoginOtp";
import useLoginPassword from "./useLoginPassword";
import { isRunningOnClient } from "../../helper/utils";

const useLogin = ({ fpi }) => {
  const location = useLocation();

  const [isPasswordToggle, setIsPasswordToggle] = useState(false);
  const platformData = useGlobalStore(fpi.getters.PLATFORM_DATA);
  const appFeatures = useGlobalStore(fpi.getters.APP_FEATURES);

  const { handleLoginWithOtp, ...restOtp } = useLoginOtp({
    fpi,
    isLoginToggle: isPasswordToggle,
  });
  const { handleLoginWthPassword, setPasswordError, ...restPassword } =
    useLoginPassword({ fpi });

  const { openRegister } = useAccounts({ fpi });

  const logo = useMemo(
    () => ({
      desktop: {
        link: "/",
        url: platformData?.desktop_image,
        alt: "Logo Image Desktop",
      },
      mobile: {
        link: "/",
        url: platformData?.mobile_image || platformData?.desktop_image,
        alt: "Logo Image Mobile",
      },
    }),
    [platformData]
  );

  const showLoginToggleButton = useMemo(
    () => platformData?.login?.otp && platformData?.login?.password,
    [platformData]
  );

  const isPassword = useMemo(() => {
    if (platformData?.login?.otp && platformData?.login?.password) {
      return isPasswordToggle;
    }
    return platformData?.login?.password;
  }, [platformData, isPasswordToggle]);

  const isOtp = useMemo(() => {
    if (platformData?.login?.otp && platformData?.login?.password) {
      return !isPasswordToggle;
    }
    return platformData?.login?.otp;
  }, [platformData, isPasswordToggle]);

  const handleRegisterClick = () => {
    const pathname = isRunningOnClient() ? location.pathname : "";
    if (pathname === "/auth/login") {
      openRegister();
    }
  };

  const handleLoginModeToggle = () => {
    setIsPasswordToggle((prevState) => !prevState);
    setPasswordError(false);
  };

  const handleLoginFormSubmit = (...args) => {
    if (isOtp) {
      handleLoginWithOtp(...args);
    }
    if (isPassword) {
      handleLoginWthPassword(...args);
    }
  };

  return {
    logo,
    title: platformData?.display,
    subTitle: platformData?.subtext,
    isPassword,
    isOtp,
    showLoginToggleButton,
    isRegisterEnabled: platformData?.register,
    registerButtonLabel: "GO TO REGISTER",
    loginButtonText: appFeatures?.landing_page?.login_btn_text,
    isForgotPassword: platformData?.forgot_password,
    ...restOtp,
    ...restPassword,
    onLoginToggleClick: handleLoginModeToggle,
    onRegisterButtonClick: handleRegisterClick,
    onLoginFormSubmit: handleLoginFormSubmit,
  };
};

export default useLogin;
