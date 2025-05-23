import React, { useState, useEffect, Fragment, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useGlobalStore } from "fdk-core/utils";
import Modal from "@gofynd/theme-template/components/core/modal/modal";
import "@gofynd/theme-template/components/core/modal/modal.css";
import FyInput from "@gofynd/theme-template/components/core/fy-input/fy-input";
import "@gofynd/theme-template/components/core/fy-input/fy-input.css";
import styles from "./styles/i18n-dropdown.less";
import FyDropdownLib from "../core/fy-dropdown/fy-dropdown-lib";
import useInternational from "./useInternational";
import { LOCALITY } from "../../queries/logisticsQuery";
import { useSyncedState, useSnackbar } from "../../helper/hooks";
import { createLocalitiesPayload } from "../../helper/utils";
import InternationalIcon from "../../assets/images/international.svg";
import ArrowDownIcon from "../../assets/images/arrow-down.svg";
import CrossIcon from "../../assets/images/cross-black.svg";

function I18Dropdown({ fpi }) {
  const {
    isInternational,
    i18nDetails,
    countries,
    currencies,
    defaultCurrency,
    countryDetails,
    currentCountry,
    currentCurrency,
    fetchCountrieDetails,
    fetchLocalities,
    setI18nDetails,
  } = useInternational({
    fpi,
  });

  const { showSnackbar } = useSnackbar();
  const location = useLocation();
  const [countryInfo, setCountryInfo] = useSyncedState(countryDetails);
  const { isI18ModalOpen = false } = useGlobalStore(fpi?.getters?.CUSTOM_VALUE);
  const locationDetails = useGlobalStore(fpi?.getters?.LOCATION_DETAILS);

  const [formSchema, setFormSchema] = useState([]);
  const [formOptions, setFormOptions] = useState({});
  const { control, handleSubmit, setValue, reset, watch, getValues } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      country: currentCountry,
      currency: currentCurrency,
    },
  });

  const showI18Dropdown = useMemo(() => {
    const whiteListedRoutes = [
      "/product",
      "/products",
      "/collections",
      "/collection",
      "/categories",
      "/brands",
      "/profile/address",
    ];

    const currentPath = location.pathname;

    if (currentPath === "/") {
      return true;
    }

    return whiteListedRoutes.some((route) => currentPath.indexOf(route) === 0);
  }, [location.pathname]);

  const addressFieldsMap = useMemo(() => {
    if (!countryInfo?.fields?.address) return {};
    const prevFieldMap = countryInfo.fields.address.reduce((acc, field) => {
      if (field.next) {
        acc[field.next] = field.slug;
      }
      return acc;
    }, {});
    return countryInfo.fields.address.reduce((acc, field) => {
      acc[field.slug] = prevFieldMap[field.slug]
        ? { ...field, prev: prevFieldMap[field.slug] }
        : field;
      return acc;
    }, {});
  }, [countryInfo]);

  const getLocalityValues = async (slug, restFields = {}) => {
    const payload = {
      pageNo: 1,
      pageSize: 1000,
      country: countryInfo?.iso2,
      locality: slug,
      ...restFields,
    };
    try {
      const localities = await fetchLocalities(payload);
      if (localities) {
        setFormOptions((prev) => ({
          ...prev,
          [slug]: localities,
        }));
      }
    } catch (error) {}
  };

  const checkLocality = (localityValue, localityType, selectedValues) => {
    return fpi
      .executeGQL(LOCALITY, {
        locality: localityType,
        localityValue,
        city: selectedValues?.city?.name,
        country: countryInfo.iso2,
        state: "",
      })
      .then((res) => {
        if (!res?.data?.locality) {
          showSnackbar(
            res?.errors?.[0]?.message || "Something went wrong",
            "error"
          );
          throw res;
        }
        return res.data.locality;
      });
  };

  const handleSetI18n = (formValues) => {
    const { currency } = formValues;
    setI18nDetails(
      {
        iso: countryInfo.iso2,
        phoneCode: countryInfo.phone_code,
        name: countryInfo.display_name,
      },
      currency?.code ?? i18nDetails?.currency?.code
    );
    const field = countryInfo?.fields?.serviceability_fields.at(-1);
    const addressField = addressFieldsMap?.[field];
    if (addressField) {
      checkLocality(
        addressField.input === "list"
          ? formValues?.[field]?.display_name
          : formValues?.pincode,
        field,
        formValues
      ).then(() => {
        fpi.custom.setValue("isI18ModalOpen", false);
      });
    }
  };

  const onDynamicFieldChange = async (selectedField) => {
    const serviceabilitySlugs =
      countryInfo?.fields?.serviceability_fields || [];
    const currentIndex = serviceabilitySlugs?.findIndex(
      (slug) => slug === selectedField.slug
    );

    const updatedFormSchema = [...formSchema];

    const nextIndex =
      currentIndex + 1 < serviceabilitySlugs.length ? currentIndex + 1 : -1;

    if (nextIndex !== -1) {
      const nextSlug = serviceabilitySlugs[nextIndex];
      updatedFormSchema.slice(nextIndex).forEach((field) => {
        setValue(field.slug, "");
      });
      getLocalityValues(
        nextSlug,
        createLocalitiesPayload(
          selectedField.slug,
          addressFieldsMap,
          getValues()
        )
      );
    }
  };

  const handleCountryChange = async (country) => {
    if (country?.meta?.country_code === countryInfo?.iso2) return;

    try {
      const response = await fetchCountrieDetails(
        { countryIsoCode: country?.meta?.country_code },
        { skipStoreUpdate: true }
      );
      if (response?.data?.country) {
        const countryInfo = response.data.country;
        setCountryInfo(countryInfo);
        const countryCurrency = currencies?.find(
          (data) => data?.code === countryInfo?.currency?.code
        );
        setValue("currency", countryCurrency ?? defaultCurrency);
      }
    } catch (error) {}
  };

  const openI18nModal = () => {
    fpi.custom.setValue("isI18ModalOpen", true);
  };

  const closeI18nModal = () => {
    fpi.custom.setValue("isI18ModalOpen", false);
    setCountryInfo(countryDetails);
    reset({
      country: currentCountry,
      currency: currentCurrency,
    });
  };

  function createValidation(validation, required, error_text, type, field) {
    const result = {};
    let errorText =
      field?.display_name?.toLowerCase() === "postcode" ||
      field?.display_name?.toLowerCase() === "postal code"
        ? `Invalid ${field?.display_name}`
        : (error_text ?? "Invalid");

    if (type === "list") {
      result.validate = (value) =>
        Object.keys(value || {}).length > 0 || errorText;

      return result;
    }

    if (required) {
      result.required = errorText;
    }

    if (validation?.type === "regex") {
      result.pattern = {
        value: new RegExp(validation?.regex?.value),
        message: errorText,
      };

      if (validation?.regex?.length?.max) {
        result.maxLength = {
          value: validation?.regex?.length?.max,
          message: errorText,
        };
      }

      if (validation?.regex?.length?.min) {
        result.minLength = {
          value: validation?.regex?.length?.min,
          message: errorText,
        };
      }
    }

    return result;
  }

  useEffect(() => {
    if (currentCountry && Object.keys(currentCountry).length > 0) {
      setValue("country", currentCountry);
    }
  }, [currentCountry, setValue]);

  useEffect(() => {
    if (currentCurrency && Object.keys(currentCurrency).length > 0) {
      setValue("currency", currentCurrency);
    }
  }, [currentCurrency, setValue]);

  useEffect(() => {
    if (countryInfo) {
      const serviceabilityFields =
        countryInfo?.fields?.serviceability_fields || [];
      const dynamicFormSchema = serviceabilityFields.map((field) => {
        const addressField = addressFieldsMap[field];

        const fieldValidation = createValidation(
          addressField.validation,
          addressField.required,
          addressField.error_text,
          addressField.input,
          addressField
        );

        if (addressField.input === "list") {
          return {
            ...addressField,
            validation: fieldValidation,
          };
        }

        return { ...addressField, validation: fieldValidation };
      });
      setFormSchema(dynamicFormSchema);
      return () => {
        setFormOptions([]);
        serviceabilityFields?.forEach((field) => {
          setValue(field, "");
        });
      };
    }
  }, [countryInfo]);

  useEffect(() => {
    if (isI18ModalOpen) {
      formSchema.forEach((field) => {
        const { slug, input, prev } = field;
        const fieldValue =
          locationDetails?.country_iso_code === countryInfo?.iso2
            ? locationDetails?.[slug] || null
            : null;

        if (fieldValue) {
          setValue(
            slug,
            input === "list" ? { display_name: fieldValue } : fieldValue
          );
        }

        if (input === "list" && (fieldValue || !prev)) {
          getLocalityValues(
            slug,
            createLocalitiesPayload(
              prev,
              addressFieldsMap,
              locationDetails?.country_iso_code === countryInfo?.iso2
                ? locationDetails
                : {}
            )
          );
        }
      });
    }
  }, [formSchema, isI18ModalOpen]);

  return (
    <div className={`${styles.internationalization}`}>
      {isInternational && showI18Dropdown && (
        <button
          className={`${styles.internationalization__selected}`}
          onClick={openI18nModal}
        >
          <InternationalIcon className={styles.internationalIcon} />
          {currentCountry?.display_name && currentCurrency?.code && (
            <>
              <span
                className={`${styles.locationLabel} ${styles.locationLabelMobile}`}
              >
                Deliver to{" "}
              </span>
              <span
                className={styles.locationLabel}
              >{`${currentCountry.display_name} - ${currentCurrency.code}`}</span>
            </>
          )}
          <ArrowDownIcon className={styles.angleDownIcon} />
        </button>
      )}
      <Modal
        hideHeader={true}
        isOpen={isI18ModalOpen}
        closeDialog={closeI18nModal}
        bodyClassName={styles.i18ModalBody}
        containerClassName={styles.i18ModalContainer}
        ignoreClickOutsideForClass="fydrop"
      >
        <h4 className={styles.title}>
          Choose your location{" "}
          <span onClick={closeI18nModal}>
            <CrossIcon />
          </span>
        </h4>
        <p className={styles.description}>
          Choose your address location to see product availability and delivery
          options
        </p>

        <form
          className={styles.internationalization__dropdown}
          onSubmit={handleSubmit(handleSetI18n)}
        >
          {isInternational && (
            <div className={`${styles.section}`}>
              <FormField
                formData={{
                  key: "country",
                  type: "list",
                  label: "Select country",
                  placeholder: "Select country",
                  options: countries,
                  dataKey: "uid",
                  onChange: handleCountryChange,
                  validation: {
                    validate: (value) =>
                      Object.keys(value || {}).length > 0 || `Invalid country`,
                  },
                  getOptionLabel: (option) => option.display_name || "",
                }}
                control={control}
              />
            </div>
          )}

          {formSchema.map((field) => (
            <Fragment key={field.slug}>
              {field?.input ? (
                <div className={`${styles.section}`}>
                  <FormField
                    formData={{
                      key: field.slug,
                      type: field?.input,
                      label: field?.display_name,
                      placeholder: field?.display_name,
                      options: formOptions[field.slug] ?? [],
                      disabled: field.prev ? !watch(field.prev) : false,
                      onChange: (value) => {
                        onDynamicFieldChange(field, value);
                      },
                      validation: field.validation,
                      getOptionLabel: (option) => option.display_name || "",
                    }}
                    control={control}
                  />
                </div>
              ) : null}
            </Fragment>
          ))}

          {isInternational && (
            <div className={`${styles.section}`}>
              <FormField
                formData={{
                  key: "currency",
                  type: "list",
                  label: "Select currency",
                  placeholder: "Select currency",
                  options: currencies,
                  dataKey: "code",
                  validation: {
                    validate: (value) =>
                      Object.keys(value || {}).length > 0 || `Invalid currency`,
                  },
                  getOptionLabel: (option) =>
                    option?.code ? `${option?.code} - ${option?.name}` : "",
                }}
                control={control}
              />
            </div>
          )}
          <button className={`${styles.save_btn}`} type="submit">
            Apply
          </button>
        </form>
      </Modal>
    </div>
  );
}

const FormField = ({ formData, control }) => {
  const {
    label = "",
    placeholder = "",
    options = [],
    key = "",
    type = "",
    onChange = (value) => {},
    validation = {},
    getOptionLabel,
    disabled = false,
    dataKey,
  } = formData;

  const InputComponent = ({ field, error }) => {
    if (type === "list") {
      return (
        <FyDropdownLib
          label={label}
          placeholder={placeholder}
          value={field.value}
          options={options}
          labelClassName={styles.autoCompleteLabel}
          containerClassName={styles.autoCompleteContainer}
          disabled={disabled}
          onChange={(value) => {
            field.onChange(value);
            onChange(value);
          }}
          error={error}
          dataKey={dataKey}
          getOptionLabel={getOptionLabel}
        />
      );
    }

    return (
      <FyInput
        name={field?.name}
        label={label}
        labelVariant="floating"
        labelClassName={styles.inputLabel}
        inputClassName={styles.inputField}
        inputVariant="outlined"
        value={field.value}
        disabled={disabled}
        onChange={(e) => {
          field.onChange(e.target.value);
        }}
        error={!!error?.message}
        errorMessage={error?.message}
      />
    );
  };

  return (
    <Controller
      name={key}
      control={control}
      rules={validation}
      render={({ field, fieldState: { error } }) =>
        InputComponent({ field, error })
      }
    />
  );
};

export default I18Dropdown;
