import { useEffect, useState } from "react";
import { useGlobalStore } from "fdk-core/utils";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  CHECKOUT_LANDING,
  FETCH_SHIPMENTS,
  SELECT_ADDRESS,
} from "../../../queries/checkoutQuery";
import { LOCALITY } from "../../../queries/logisticsQuery";
import { capitalize } from "../../../helper/utils";
import useInternational from "../../../components/header/useInternational";
import { useAddressFormSchema, useSnackbar } from "../../../helper/hooks";

const useAddress = (setShowShipment, setShowPayment, fpi) => {
  const allAddresses =
    useGlobalStore(fpi.getters.ADDRESS)?.address || undefined;
  const isAddressLoading =
    useGlobalStore(fpi.getters.ADDRESS)?.loading || false;

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const cart_id = searchParams.get("id");
  const address_id = searchParams.get("address_id");
  const buyNow = JSON.parse(searchParams?.get("buy_now") || "false");
  const [selectedAddressId, setSelectedAddressId] = useState(address_id || "");
  const [invalidAddressError, setInvalidAddressError] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [isNewAddress, setIssNewAddress] = useState(true);
  const [addressItem, setAddressItem] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [addressLoader, setAddressLoader] = useState(false);
  const [hideAddress, setHideAddress] = useState(false);
  const [isShipmentLoading, setIsShipmentLoading] = useState(false);

  const getDefaultAddress =
    allAddresses?.filter((item) => item?.is_default_address) || [];
  const getOtherAddress =
    allAddresses?.filter((item) => !item?.is_default_address) || [];
  const CART = useGlobalStore(fpi.getters.CART);
  const { cart_items } = CART || {};
  const { showSnackbar } = useSnackbar();

  const {
    isInternational,
    countries,
    countryDetails,
    currentCountry,
    fetchCountrieDetails,
    setI18nDetails,
  } = useInternational({
    fpi,
  });
  const [selectedCountry, setSelectedCountry] = useState(currentCountry);
  const [countrySearchText, setCountrySearchText] = useState("");

  useEffect(() => {
    resetAddressState();
    if (
      (cart_items?.checkout_mode === "other" && !hideAddress) ||
      (allAddresses && !allAddresses.length)
    ) {
      showAddNewAddressModal();
    }
  }, [allAddresses]);

  useEffect(() => {
    if (currentCountry) {
      setSelectedCountry(currentCountry);
    }
  }, [currentCountry]);

  const { formSchema, defaultAddressItem } = useAddressFormSchema({
    fpi,
    countryCode: countryDetails?.phone_code,
    countryIso: countryDetails?.iso2,
    addressTemplate: countryDetails?.fields?.address_template?.checkout_form,
    addressFields: countryDetails?.fields?.address,
  });

  function convertDropDownField(inputField) {
    return {
      key: inputField.display_name,
      display: inputField.display_name,
    };
  }

  const handleCountryChange = async (e) => {
    const selectedCountry = countries.find(
      (country) => country.display_name === e
    );
    setSelectedCountry(selectedCountry);
    try {
      const response = await fetchCountrieDetails({
        countryIsoCode: selectedCountry?.meta?.country_code,
      });
      if (response?.data?.country) {
        const countryInfo = response.data.country;
        setI18nDetails({
          iso: countryInfo.iso2,
          phoneCode: countryInfo.phone_code,
          name: countryInfo.display_name,
          currency: countryInfo.currency.code,
        });
      }
    } catch (error) {}
  };

  const handleCountrySearch = (event) => {
    setCountrySearchText(event);
  };

  const getFilteredCountries = (selectedCountry) => {
    if (!countrySearchText) {
      return countries?.map((country) => convertDropDownField(country)) || [];
    }
    return countries?.filter(
      (country) =>
        country?.display_name
          ?.toLowerCase()
          ?.indexOf(countrySearchText?.toLowerCase()) !== -1 &&
        country?.id !== selectedCountry?.id
    );
  };

  useEffect(() => {
    if (address_id) {
      // setSelectedAddressId(id);
      return;
    }
    if (getDefaultAddress.length && !selectedAddressId) {
      setSelectedAddressId(getDefaultAddress?.[0].id);
    } else if (getOtherAddress.length && !selectedAddressId) {
      setSelectedAddressId(getOtherAddress?.[0]?.id);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [allAddresses, address_id]);

  useEffect(() => {
    const { autoNaviagtedFromCart, addrId } = location?.state ?? {};
    if (autoNaviagtedFromCart && addrId) {
      setIsShipmentLoading(true);
      fpi
        .executeGQL(FETCH_SHIPMENTS, {
          addressId: `${addrId.length ? addrId : selectedAddressId}`,
          id: `${cart_id}`,
          buyNow,
        })
        .then(() => {
          setShowShipment(true);
          navigate(location.pathname, { replace: true, state: null });
        })
        .finally(() => {
          setIsShipmentLoading(false);
        });
    }
  }, [location.state, navigate]);

  const resetAddressState = () => {
    setOpenModal(false);
    setIssNewAddress(true);
    setAddressItem(false);
    setModalTitle("");
  };

  const editAddress = (item) => {
    setModalTitle("Edit Address");
    setI18nDetails({
      iso: item.country_iso_code,
      phoneCode: item.country_code,
      name: item.country,
    });
    setAddressItem({
      ...item,
      phone: {
        mobile: item?.phone,
        countryCode: item?.country_code?.replace("+", ""),
        isValidNumber: true,
      },
    });
    setIssNewAddress(false);
    setOpenModal(true);
  };

  const addAddress = (obj) => {
    if (
      obj?.geo_location?.latitude === "" &&
      obj?.geo_location?.longitude === ""
    ) {
      delete obj.geo_location;
    }
    for (const key in obj) {
      if (obj[key] === undefined) {
        delete obj[key]; // Removes undefined values directly from the original object
      }
    }
    obj.country_phone_code = `+${obj.phone.countryCode}`;
    obj.phone = obj.phone.mobile;
    setAddressLoader(true);
    const payload = {
      address2Input: {
        ...obj,
      },
    };
    fpi
      .executeGQL(
        `mutation AddAddress($address2Input: Address2Input) {
          addAddress(address2Input: $address2Input) {
          id
          is_default_address
          success
        }
    }`,
        payload
      )
      .then((res) => {
        setAddressLoader(false);
        if (res?.data?.addAddress?.success) {
          if (cart_items?.checkout_mode === "other") {
            setHideAddress(true);
          }
          showSnackbar("Address added successfully", "success");
          resetAddressState();
          fpi
            .executeGQL(CHECKOUT_LANDING, { includeBreakup: true, buyNow })
            .then(() => {
              selectAddress(res?.data?.addAddress?.id);
            });
          setAddressLoader(false);
        } else {
          fpi.executeGQL(CHECKOUT_LANDING, { includeBreakup: true, buyNow });
          showSnackbar(
            res?.errors?.[0]?.message ?? "Failed to create new address",
            "error"
          );
          setAddressLoader(false);
        }
      });
  };

  const updateAddress = (obj) => {
    if (
      obj?.geo_location?.latitude === "" &&
      obj?.geo_location?.longitude === ""
    ) {
      delete obj.geo_location;
    }
    for (const key in obj) {
      if (obj[key] === undefined) {
        delete obj[key]; // Removes undefined values directly from the original object
      }
    }
    obj.country_phone_code = `+${obj?.phone?.countryCode}`;
    obj.phone = obj?.phone?.mobile;

    const add = obj;
    delete add?.custom_json;
    delete add?.otherAddressType;
    /* eslint-disable no-underscore-dangle */
    delete add?.__typename;

    const payload = {
      id: selectedAddressId,
      address2Input: {
        ...add,
      },
    };

    fpi
      .executeGQL(
        `mutation UpdateAddress($address2Input: Address2Input, $id: String) {
        updateAddress(address2Input: $address2Input, id: $id) {
        id
        is_default_address
        success
        is_updated
        }
    }`,
        payload
      )
      .then((res) => {
        if (res?.data?.updateAddress?.success) {
          fpi
            .executeGQL(CHECKOUT_LANDING, { includeBreakup: true, buyNow })
            .then(() => selectAddress());
          showSnackbar("Address updated successfully", "success");
          resetAddressState();
        } else {
          fpi.executeGQL(CHECKOUT_LANDING, { includeBreakup: true, buyNow });
          showSnackbar(
            res?.errors?.[0]?.message || "Failed to update an address",
            "error"
          );
        }
      });
  };

  const removeAddress = () => {
    fpi
      .executeGQL(
        `
    mutation RemoveAddress($id: String) {
        removeAddress(id: $id){
            id
            is_deleted
        }
    }`,
        { id: selectedAddressId }
      )
      .then((res) => {
        if (res?.data?.removeAddress?.is_deleted) {
          fpi.executeGQL(CHECKOUT_LANDING, { includeBreakup: true, buyNow });
          showSnackbar("Address deleted successfully", "success");
        } else {
          fpi.executeGQL(CHECKOUT_LANDING, { includeBreakup: true, buyNow });
          showSnackbar("Failed to delete an address", "error");
          resetAddressState();
        }
      });
  };

  const updateQuery = (key, value) => {
    const queryParamKey = key; // Replace with your desired query parameter key
    const queryParamValue = value; // Replace with your desired query parameter value

    const searchParameter = new URLSearchParams(location.search);
    const existingValue = searchParameter.get(queryParamKey);

    if (existingValue !== null) {
      // Key already exists, update the value
      searchParameter.set(queryParamKey, queryParamValue);
    } else {
      // Key doesn't exist, add the new query parameter
      searchParameter.append(queryParamKey, queryParamValue);
    }

    const updatedSearch = searchParameter.toString();
    navigate({ search: updatedSearch });
  };

  const selectAddress = (id = "") => {
    const findAddress = allAddresses?.find(
      (item) => item?.id === selectedAddressId
    );
    const payload = {
      cartId: cart_id,
      buyNow,
      selectCartAddressRequestInput: {
        cart_id,
        id: id.length ? id : findAddress?.id,
        billing_address_id: id.length ? id : findAddress?.id,
      },
    };

    fpi.executeGQL(SELECT_ADDRESS, payload).then((res) => {
      if (res?.data?.selectAddress?.is_valid) {
        setIsShipmentLoading(true);
        updateQuery("address_id", id.length ? id : selectedAddressId);
        fpi
          .executeGQL(FETCH_SHIPMENTS, {
            addressId: `${id.length ? id : selectedAddressId}`,
            id: `${cart_id}`,
            buyNow,
          })
          .finally(() => {
            setIsShipmentLoading(false);
          });

        if (findAddress?.area_code) {
          fpi.executeGQL(LOCALITY, {
            locality: "pincode",
            localityValue: findAddress?.area_code,
            country: findAddress?.country_iso_code,
          });
        }
        setShowShipment(true);
        setAddressLoader(false);
        setInvalidAddressError(null);
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } else {
        setInvalidAddressError({
          id: id.length ? id : findAddress?.id,
          message:
            res?.data?.selectAddress?.message || res?.errors?.[0]?.message,
        });
      }
    });
  };

  const onFailedGetCartShipmentDetails = async () => {
    setIsShipmentLoading(true);
    await fpi
      .executeGQL(FETCH_SHIPMENTS, {
        addressId: `${selectedAddressId}`,
        id: `${cart_id}`,
        buyNow,
      })
      .finally(() => {
        setIsShipmentLoading(false);
      });
  };

  const removeQuery = (key) => {
    const queryParamKeyToRemove = key; // Replace with the query parameter key to remove

    const searchParam = new URLSearchParams(location.search);
    searchParam.delete(queryParamKeyToRemove);

    const updatedSearch = searchParam.toString();

    navigate({ search: updatedSearch });
  };

  function backToEdit() {
    removeQuery("address_id");
    setShowShipment(false);
    setShowPayment(false);
  }

  function showAddNewAddressModal() {
    setModalTitle("Add New Address");
    setOpenModal(true);
  }

  function getLocality(posttype, postcode) {
    return fpi
      .executeGQL(LOCALITY, {
        locality: posttype,
        localityValue: `${postcode}`,
        country: selectedCountry?.meta?.country_code,
      })
      .then((res) => {
        const data = { showError: false, errorMsg: "" };
        const localityObj = res?.data?.locality || false;
        if (localityObj) {
          localityObj?.localities.forEach((locality) => {
            switch (locality.type) {
              case "city":
                data.city = capitalize(locality.display_name);
                break;
              case "state":
                data.state = capitalize(locality.display_name);
                break;
              case "country":
                data.country = capitalize(locality.display_name);
                break;
              default:
                break;
            }
          });

          return data;
        }
        showSnackbar(
          res?.errors?.[0]?.message || "Pincode verification failed"
        );
        data.showError = true;
        data.errorMsg =
          res?.errors?.[0]?.message || "Pincode verification failed";
        return data;
      });
  }

  return {
    allAddresses,
    addressItem: addressItem || defaultAddressItem,
    selectedAddressId,
    invalidAddressError,
    getDefaultAddress,
    getOtherAddress,
    isAddressLoading,
    addressLoader,
    modalTitle,
    openModal,
    isNewAddress,
    setOpenModal,
    setModalTitle,
    setAddressItem,
    setIssNewAddress,
    resetAddressState,
    editAddress,
    addAddress,
    removeAddress,
    updateAddress,
    selectAddress,
    backToEdit,
    showAddNewAddressModal,
    setSelectedAddressId,
    getLocality,
    isInternationalShippingEnabled: isInternational,
    defaultFormSchema: formSchema,
    setI18nDetails: handleCountryChange,
    handleCountrySearch,
    getFilteredCountries,
    selectedCountry: selectedCountry || countryDetails,
    countryDetails,
    onFailedGetCartShipmentDetails,
    isShipmentLoading,
  };
};

export default useAddress;
