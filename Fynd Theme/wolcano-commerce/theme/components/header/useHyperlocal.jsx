import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalStore } from "fdk-core/utils";
import {
  useThemeConfig,
  useToggleState,
  useHyperlocalTat,
  useGoogleMapConfig,
} from "../../helper/hooks";
import { LOCALITY, DELIVERY_PROMISE } from "../../queries/logisticsQuery";

const useHyperlocal = (fpi) => {
  const location = useLocation();
  const { globalConfig } = useThemeConfig({ fpi });
  const { mapApiKey } = useGoogleMapConfig({ fpi });
  const { convertUTCToHyperlocalTat } = useHyperlocalTat({ fpi });
  const [deliveryPromise, setDeliveryPromise] = useState(null);
  const [servicibilityError, setServicibilityError] = useState(null);
  const [isPromiseLoading, setIsPromiseLoading] = useState(true);

  const locationDetails = useGlobalStore(fpi.getters.LOCATION_DETAILS);

  const {
    is_hyperlocal: isHyperlocal,
    is_mandatory_pincode: isMandatoryPincode,
  } = globalConfig;

  const {
    isOpen: isLocationModalOpen,
    open: handleLocationModalOpen,
    close: locationModalClose,
  } = useToggleState();

  const handleLocationModalClose = () => {
    if (isMandatoryPincode && !locationDetails?.pincode) {
      return;
    }
    locationModalClose();
  };

  const deliveryMessage = useMemo(() => {
    if (servicibilityError) {
      return "Product not serviceable";
    }
    if (!deliveryPromise?.min) {
      return "";
    }
    return convertUTCToHyperlocalTat(deliveryPromise?.min);
  }, [deliveryPromise, servicibilityError, convertUTCToHyperlocalTat]);

  const fetchDeliveryPromise = () => {
    setServicibilityError(null);
    return fpi.executeGQL(DELIVERY_PROMISE, null).then((response) => {
      if (response?.errors) {
        throw response?.errors?.[0];
      }
      setDeliveryPromise(response.data.deliveryPromise.promise);
      return response;
    });
  };

  const fetchLocality = (pincode) => {
    const payload = {
      locality: "pincode",
      localityValue: pincode,
      country: "IN",
    };

    return fpi.executeGQL(LOCALITY, payload).then((response) => {
      if (response?.errors) {
        throw response?.errors?.[0];
      }
      return response;
    });
  };

  const handleCurrentLocClick = () => {
    if (!navigator || !("geolocation" in navigator)) {
      setServicibilityError({
        message: "Location access failed. Enter pincode manually",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!mapApiKey) {
          return;
        }

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${mapApiKey}`
          );
          const data = await response.json();
          if (!data.results.length) {
            setServicibilityError({
              message: "Location access failed. Enter pincode manually",
            });
          }
          if (data.results.length > 0) {
            let postalCode = null;
            for (const address of data.results) {
              const postalCodeComponent = address.address_components.find(
                (component) => component.types.includes("postal_code")
              );
              if (postalCodeComponent) {
                postalCode = postalCodeComponent;
                break;
              }
            }
            if (postalCode) {
              handlePincodeSubmit({ pincode: postalCode.long_name });
            }
          }
        } catch (error) {
          setServicibilityError({
            message: "Location access failed. Enter pincode manually",
          });
        }
      },
      (err) => {
        setServicibilityError({
          message: "Location access failed. Enter pincode manually",
        });
      }
    );
  };

  const handlePincodeSubmit = async ({ pincode: newPincode }) => {
    try {
      await fetchLocality(newPincode);
      if (newPincode === locationDetails?.pincode) {
        fetchDeliveryPromise()
          .then(() => {
            handleLocationModalClose();
          })
          .catch((error) => {
            setServicibilityError({
              message: error?.message || "Something went wrong",
            });
          });
      }
    } catch (error) {
      setServicibilityError({
        message: error?.message || "Something went wrong",
      });
    }
  };

  useEffect(() => {
    if (isMandatoryPincode && !locationDetails?.pincode) {
      handleLocationModalOpen();
    }
  }, [isMandatoryPincode, locationDetails?.pincode]);

  useEffect(() => {
    if (isHyperlocal && locationDetails?.pincode) {
      fetchDeliveryPromise()
        .then(() => {
          handleLocationModalClose();
        })
        .catch((error) => {
          setServicibilityError({
            message: error?.message || "Something went wrong",
          });
        })
        .finally(() => {
          setIsPromiseLoading(false);
        });
    } else {
      setIsPromiseLoading(false);
    }
  }, [isHyperlocal, locationDetails?.pincode]);

  return {
    isHyperlocal: useMemo(() => {
      const regexPattern =
        /^(\/cart\/checkout|\/profile\/orders(\/shipment\/\w+)?)$/;
      if (regexPattern.test(location.pathname)) {
        return false;
      }
      return isHyperlocal;
    }, [location.pathname, isHyperlocal]),
    isLoading: isPromiseLoading,
    pincode: locationDetails?.pincode,
    deliveryMessage,
    isCurrentLocButton: !!mapApiKey,
    servicibilityError,
    isLocationModalOpen,
    handleLocationModalOpen,
    handleLocationModalClose,
    handleCurrentLocClick,
    handlePincodeSubmit,
  };
};

export default useHyperlocal;
