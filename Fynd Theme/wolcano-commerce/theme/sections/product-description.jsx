import React, { useEffect, useMemo, useState, useRef } from "react";
import { useGlobalStore, useFPI } from "fdk-core/utils";
import { FDKLink, BlockRenderer } from "fdk-core/components";
import { useParams, useLocation } from "react-router-dom";
import OutsideClickHandler from "react-outside-click-handler";
import FyButton from "@gofynd/theme-template/components/core/fy-button/fy-button";
import "@gofynd/theme-template/components/loader/loader.css";
import FyImage from "../components/core/fy-image/fy-image";
import ShareItem from "../components/share-item/share-item";
import ProductCompareButton from "../page-layouts/compare/product-compare-button";
import useProductDescription from "../page-layouts/pdp/product-description/useProductDescription";
import PdpImageGallery from "../page-layouts/pdp/components/image-gallery/image-gallery";
import ProductVariants from "../page-layouts/pdp/components/product-variants/product-variants";
import SizeGuide from "../page-layouts/pdp/size-guide/size-guide";
import DeliveryInfo from "../page-layouts/pdp/components/delivery-info/delivery-info";
import Offers from "../page-layouts/pdp/components/offers/offers";
import ProdDesc from "../page-layouts/pdp/components/prod-desc/prod-desc";
import BreadCrumb from "../page-layouts/pdp/components/breadcrumb/breadcrumb";
import Badges from "../page-layouts/pdp/components/badges/badges";
import StickyAddToCart from "../page-layouts/pdp/components/sticky-addtocart/sticky-addtocart";
import MoreOffers from "../page-layouts/pdp/components/offers/more-offers";
import StoreModal from "../page-layouts/pdp/components/store/store-modal";
import EmptyState from "../components/empty-state/empty-state";
import {
  isEmptyOrNull,
  isRunningOnClient,
  currencyFormat,
} from "../helper/utils";
import { useSnackbar, useViewport } from "../helper/hooks";
import styles from "../styles/sections/product-description.less";
import { GET_PRODUCT_DETAILS } from "../queries/pdpQuery";
import QuantityController from "@gofynd/theme-template/components/quantity-control/quantity-control";
import "@gofynd/theme-template/components/quantity-control/quantity-control.css";
import useCart from "../page-layouts/cart/useCart";
import { createPortal } from "react-dom";
import Shimmer from "../components/shimmer/shimmer";
import ShareDesktopIcon from "../assets/images/share-desktop.svg";
import ArrowDownIcon from "../assets/images/arrow-down.svg";
import CartIcon from "../assets/images/cart.svg";
import BuyNowIcon from "../assets/images/buy-now.svg";
import ScaleIcon from "../assets/images/scale.svg";

export function Component({ props = {}, globalConfig = {}, blocks = [] }) {
  const fpi = useFPI();
  const {
    icon_color,
    variant_position,
    product,
    enable_buy_now,
    img_resize,
    img_resize_mobile,
  } = props;

  const addToCartBtnRef = useRef(null);
  const params = useParams();
  const location = useLocation();

  const isPDP = /^\/product\/[^/]+\/?$/.test(location.pathname);
  const slug = isPDP ? params?.slug : product?.value;

  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [isLoadingCart, setIsLaodingCart] = useState(false);

  const getBlockConfigValue = (block, id) => block?.props?.[id]?.value ?? "";
  const { showSnackbar } = useSnackbar();

  const imgSources = useMemo(() => {
    if (globalConfig?.img_hd) {
      return [];
    }
    return [
      { breakpoint: { min: 481 }, width: img_resize?.value ?? 700 },
      { breakpoint: { max: 480 }, width: img_resize_mobile?.value ?? 700 },
    ];
  }, [globalConfig?.img_hd, img_resize?.value, img_resize_mobile?.value]);

  const isSizeWrapperAvailable = useMemo(() => {
    return !!blocks.find((block) => block.type === "size_wrapper");
  }, [blocks]);

  const blockProps = useMemo(() => {
    const currentProps = {
      size_guide: false,
      preselect_size: false,
      hide_single_size: false,
      tax_label: "",
      mrp_label: false,
      show_offers: false,
      show_logo: false,
    };

    blocks.forEach((block) => {
      if (block.type === "size_guide") {
        currentProps.size_guide =
          getBlockConfigValue(block, "size_guide") || false;
      }

      if (block.type === "size_wrapper") {
        currentProps.preselect_size =
          getBlockConfigValue(block, "preselect_size") || false;
        currentProps.hide_single_size =
          getBlockConfigValue(block, "hide_single_size") || false;
      }

      if (block.type === "product_tax_label") {
        currentProps.tax_label = getBlockConfigValue(block, "tax_label") || "";
      }

      if (block.type === "product_price") {
        currentProps.mrp_label =
          getBlockConfigValue(block, "mrp_label") || false;
      }

      if (block.type === "offers") {
        currentProps.show_offers =
          getBlockConfigValue(block, "show_offers") || false;
      }

      if (block.type === "pincode") {
        currentProps.show_logo =
          getBlockConfigValue(block, "show_logo") || false;
      }
    });

    return currentProps;
  }, [blocks]);

  const application = useGlobalStore(fpi.getters.APPLICATION);

  const {
    productDetails,
    isLoading,
    isLoadingPriceBySize,
    productPriceBySlug,
    productMeta,
    pincode,
    coupons,
    followed,
    promotions,
    selectPincodeError,
    pincodeErrorMessage,
    setCurrentSize,
    addToWishList,
    removeFromWishlist,
    addProductForCheckout,
    checkPincode,
    setPincodeErrorMessage,
    isPageLoading,
    pincodeInput,
    isValidDeliveryLocation,
    deliveryLocation,
    isServiceabilityPincodeOnly,
    currentSize,
    incrementDecrementUnit,
    maxCartQuantity,
    minCartQuantity,
    allStoresInfo,
    getProductSellers,
    isSellerLoading,
    buybox,
  } = useProductDescription({ fpi, slug, props });

  const { onUpdateCartItems, isCartUpdating, cartItems } = useCart(fpi, false);

  const singleItemDetails = useMemo(() => {
    let selectedItemDetails = {};

    if (currentSize?.value) {
      const cartItemsKey = Object.keys(cartItems || {});
      const selectedItemKey = `${productDetails?.uid}_${currentSize.value}_${productPriceBySlug?.store?.uid}`;

      cartItemsKey.some((item, index) => {
        if (item === selectedItemKey) {
          selectedItemDetails = { ...cartItems[item], itemIndex: index };
          return true;
        }

        return false;
      });
    }

    return selectedItemDetails;
  }, [currentSize, cartItems, productDetails, productPriceBySlug]);

  const priceDataDefault = productMeta?.price;
  const [selectedSize, setSelectedSize] = useState("");
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showMoreOffers, setShowMoreOffers] = useState(false);
  const [sidebarActiveTab, setSidebarActiveTab] = useState("coupons");
  const [errMessage, setErrorMessage] = useState("");
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const isMobile = useViewport(0, 768);
  const {
    media,
    grouped_attributes,
    brand,
    name,
    short_description,
    variants,
    sizes,
  } = productDetails;

  const { isProductNotFound } = useGlobalStore(fpi?.getters?.CUSTOM_VALUE);
  const isMto = productDetails?.custom_order?.is_custom_order || false;
  const { show_price, disable_cart, show_quantity_control } = globalConfig;

  const priceDataBySize = productPriceBySlug?.price;
  const isSizeSelectionBlock = (block) =>
    getBlockConfigValue(block, "size_selection_style") === "block";
  const isSingleSize = sizes?.sizes?.length === 1;
  const isSizeCollapsed = blockProps?.hide_single_size && isSingleSize;

  function getManufacturingTime() {
    const custom_order = productDetails?.custom_order;
    if (
      custom_order?.manufacturing_time >= 0 &&
      custom_order?.manufacturing_time_unit
    ) {
      return custom_order;
    }
    return false;
  }

  const getProductPrice = (key) => {
    if (selectedSize && !isEmptyOrNull(productPriceBySlug.price)) {
      if (productPriceBySlug?.set) {
        return currencyFormat(productPriceBySlug?.price_per_piece[key]) || "";
      }
      const price = productPriceBySlug?.price || "";
      return currencyFormat(price?.[key], price?.currency_symbol) || "";
    }
    if (selectedSize && priceDataDefault) {
      return (
        currencyFormat(
          priceDataDefault?.[key]?.min,
          priceDataDefault?.[key]?.currency_symbol
        ) || ""
      );
    }
    if (priceDataDefault) {
      return priceDataDefault?.[key]?.min !== priceDataDefault?.[key]?.max
        ? `${priceDataDefault?.[key]?.currency_symbol || ""} ${
            currencyFormat(priceDataDefault?.[key]?.min) || ""
          } - ${currencyFormat(priceDataDefault?.[key]?.max) || ""}`
        : currencyFormat(
            priceDataDefault?.[key]?.max,
            priceDataDefault?.[key]?.currency_symbol
          ) || "";
    }
  };

  const onSizeSelection = (size) => {
    if (size?.quantity === 0 && !isMto) {
      return;
    }
    setSelectedSize(size?.value);
    setCurrentSize(size);
    setShowSizeDropdown(false);
  };

  useEffect(() => {
    if (
      isSizeCollapsed ||
      (blockProps?.preselect_size && sizes !== undefined)
    ) {
      onSizeSelection(sizes?.sizes?.[0]);
    }
  }, [isSizeCollapsed, blockProps?.preselect_size, sizes?.sizes]);

  // function getReviewRatingInfo() {
  //   const customMeta = productDetails?.custom_meta || [];

  //   return getReviewRatingData(customMeta);
  // }

  const discountLabel = useMemo(() => {
    const productDiscount = productPriceBySlug?.discount;
    const sizeDiscount = sizes?.discount;

    return selectedSize ? productDiscount : productDiscount || sizeDiscount;
  }, [productPriceBySlug, sizes]);

  const isSizeGuideAvailable = useMemo(() => {
    const sizeChartHeader = productMeta?.size_chart?.headers || {};
    return (
      Object.keys(sizeChartHeader).length > 0 || productMeta?.size_chart?.image
    );
  }, [productMeta]);

  const soldBy = useMemo(() => {
    const sellerInfo = productPriceBySlug?.seller || {};
    const storeInfo = productPriceBySlug?.store || {};

    return buybox?.is_seller_buybox_enabled
      ? { ...sellerInfo, count: sellerInfo.count ?? storeInfo.count }
      : storeInfo;
  }, [productPriceBySlug, buybox]);

  const isAllowStoreSelection = useMemo(() => {
    return buybox?.enable_selection && soldBy?.count > 1;
  }, [buybox, soldBy]);

  const sellerStoreName = useMemo(() => {
    const sellerName = productPriceBySlug?.seller?.name;
    const storeName = productPriceBySlug?.store?.name;

    return [sellerName, storeName].filter(Boolean).join(", ") || "";
  }, [productPriceBySlug]);

  const handleShare = async () => {
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: "Amazing Product",
          text: `Check out this amazing product on ${application?.name}`,
          url: window?.location?.href,
        });
      } catch (error) {
        console.error("Sharing failed", error);
      }
    } else setShowSocialLinks(true);
  };

  const cartUpdateHandler = async (
    event,
    itemDetails,
    itemSize,
    quantity,
    itemIndex,
    operation
  ) => {
    let totalQuantity = (itemDetails?.quantity || 0) + quantity;

    if (operation === "edit_item") {
      totalQuantity = quantity;
    }

    if (!isMto) {
      if (totalQuantity > maxCartQuantity) {
        totalQuantity = maxCartQuantity;
        showSnackbar(`Maximum quantity is ${maxCartQuantity}.`, "error");
      }

      if (totalQuantity < minCartQuantity) {
        if (operation === "edit_item") {
          totalQuantity = minCartQuantity;
          showSnackbar(`Minimum quantity is ${minCartQuantity}.`, "error");
        } else if (itemDetails?.quantity > minCartQuantity) {
          totalQuantity = minCartQuantity;
        } else {
          totalQuantity = 0;
        }
      }
    }

    if (itemDetails?.quantity !== totalQuantity) {
      onUpdateCartItems(
        event,
        itemDetails,
        itemSize,
        totalQuantity,
        itemIndex,
        "update_item"
      );
    }
  };

  const toggleStoreModal = () => {
    setShowStoreModal((modal) => {
      const updatedModal = !modal;

      if (typeof document !== "undefined") {
        const classList = document.body?.classList;

        if (updatedModal && classList) {
          classList.add("remove-scroll");
        } else {
          classList.remove("remove-scroll");
        }
      }

      return updatedModal;
    });
  };

  const onSellerClick = () => {
    if (isAllowStoreSelection) {
      toggleStoreModal();
      getProductSellers();
    }
  };

  if (isRunningOnClient() && isPageLoading) {
    return <Shimmer />;
  }

  if (isProductNotFound) {
    return <EmptyState title="No product found" />;
  }

  return (
    <>
      <div className={`${styles.mainContainer}`}>
        <BreadCrumb
          productData={productDetails}
          config={props}
          customClass={styles.isDesktop}
        />
        <div className={styles.productDescContainer}>
          <div className={styles.left}>
            {media?.length > 0 && (
              <div className={styles.imgWrap}>
                <PdpImageGallery
                  key={slug}
                  images={media}
                  iconColor={icon_color?.value || ""}
                  globalConfig={globalConfig}
                  followed={followed}
                  imgSources={imgSources}
                  removeFromWishlist={removeFromWishlist}
                  addToWishList={addToWishList}
                  isCustomOrder={isMto}
                  handleShare={() => handleShare()}
                />
              </div>
            )}
          </div>
          <div className={styles.right}>
            <div className={styles.product}>
              <BreadCrumb
                productData={productDetails}
                config={props}
                customClass={styles.isMobile}
              />

              {blocks &&
                blocks.map((block, index) => {
                  switch (block.type) {
                    case "product_name":
                      return (
                        <div className={styles.titleBlock}>
                          {getBlockConfigValue(block, "show_brand") && (
                            <h3 className={`${styles.productBrand} fontHeader`}>
                              {brand?.name || ""}
                            </h3>
                          )}
                          <div className={styles.productTitleWrapper}>
                            <h1
                              className={`${styles.productTitle} ${styles.fontHeader} fontHeader h3`}
                            >
                              {name}
                            </h1>
                            <>
                              <span
                                className={styles.shareIcon}
                                onClick={() => handleShare()}
                              >
                                <ShareDesktopIcon />
                              </span>
                              {showSocialLinks && (
                                <ShareItem
                                  setShowSocialLinks={setShowSocialLinks}
                                  handleShare={() => handleShare()}
                                  description={`Check out this amazing product on ${application?.name}`}
                                />
                              )}
                            </>
                          </div>
                        </div>
                      );

                    case "product_price":
                      return (
                        <>
                          {show_price && (
                            <div className={styles.product__price}>
                              {!isLoading && productMeta?.sellable && (
                                <>
                                  {getProductPrice("effective") &&
                                    getBlockConfigValue(block, "mrp_label") &&
                                    getProductPrice("effective") ===
                                      getProductPrice("marked") && (
                                      <span
                                        className={`${styles.mrpLabel} ${styles["mrpLabel--effective"]}`}
                                        style={{ marginLeft: 0 }}
                                      >
                                        MRP:
                                      </span>
                                    )}
                                  <h4
                                    className={
                                      styles["product__price--effective"]
                                    }
                                  >
                                    {getProductPrice("effective")}
                                  </h4>
                                  <div className={styles.mrpStrike}>
                                    {getProductPrice("marked") &&
                                      getBlockConfigValue(block, "mrp_label") &&
                                      getProductPrice("effective") !==
                                        getProductPrice("marked") && (
                                        <span
                                          className={`${styles.mrpLabel} ${styles["mrpLabel--marked"]}`}
                                        >
                                          MRP:
                                        </span>
                                      )}
                                    {getProductPrice("effective") !==
                                      getProductPrice("marked") && (
                                      <span
                                        className={
                                          styles["product__price--marked"]
                                        }
                                      >
                                        {getProductPrice("marked")}
                                      </span>
                                    )}
                                  </div>
                                  {discountLabel && (
                                    <span
                                      className={
                                        styles["product__price--discount"]
                                      }
                                    >
                                      {discountLabel}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </>
                      );

                    case "product_tax_label":
                      return (
                        <>
                          {getBlockConfigValue(block, "tax_label") &&
                            productMeta?.sellable && (
                              <div
                                className={`captionNormal ${styles.taxLabel}`}
                              >
                                {getBlockConfigValue(block, "tax_label")}
                              </div>
                            )}
                        </>
                      );

                    case "short_description":
                      return (
                        <>
                          {short_description?.length > 0 && (
                            <p
                              className={`b2 ${styles.fontBody} ${styles.shortDescription}`}
                            >
                              {short_description}
                            </p>
                          )}
                        </>
                      );

                    case "product_variants":
                      return (
                        <>
                          {variants?.length > 0 && (
                            <div>
                              <ProductVariants
                                product={productDetails}
                                variants={variants}
                                currentSlug={slug}
                                globalConfig={globalConfig}
                              />
                            </div>
                          )}
                        </>
                      );

                    case "seller_details":
                      return (
                        <>
                          {getBlockConfigValue(block, "show_seller") &&
                            selectedSize &&
                            !isEmptyOrNull(productPriceBySlug) &&
                            buybox?.show_name &&
                            sellerStoreName && (
                              <div
                                className={`${styles.sellerInfo} ${styles.fontBody}`}
                              >
                                <div
                                  className={`${styles.storeSeller} captionNormal`}
                                >
                                  <span className={styles.soldByLabel}>
                                    Sold by :
                                  </span>
                                  <div
                                    // v-if="showSellerStoreLabel"
                                    className={`${styles.nameWrapper} ${isAllowStoreSelection ? styles.selectable : ""}`}
                                    onClick={onSellerClick}
                                  >
                                    <p className={styles.storeSellerName}>
                                      {soldBy?.name}
                                    </p>
                                    {isAllowStoreSelection && (
                                      <>
                                        <span
                                          className={`captionSemiBold ${styles.otherSellers}`}
                                        >
                                          &nbsp;&&nbsp;
                                          {`${soldBy?.count - 1} Other${soldBy?.count > 2 ? "s" : ""}`}
                                        </span>
                                        <ArrowDownIcon
                                          className={styles.dropdownArrow}
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          <StoreModal
                            isOpen={showStoreModal}
                            buybox={buybox}
                            allStoresInfo={allStoresInfo}
                            onCloseDialog={toggleStoreModal}
                            addItemForCheckout={(e, isBuyNow, item) =>
                              addProductForCheckout(
                                e,
                                selectedSize,
                                isBuyNow,
                                item
                              )
                            }
                            getProductSellers={getProductSellers}
                            isSellerLoading={isSellerLoading}
                          />
                        </>
                      );

                    case "size_wrapper":
                      return (
                        <>
                          <div className={styles.sizeWrapperContainer}>
                            <div className={styles.sizeContainer}>
                              {isSizeSelectionBlock(block) &&
                                productMeta?.sellable &&
                                sizes?.sizes?.length && (
                                  <div
                                    className={`${styles.sizeSelection} ${
                                      isSizeCollapsed
                                        ? styles["sizeSelection--collapse"]
                                        : ""
                                    }`}
                                  >
                                    <div>
                                      <p
                                        className={`b2 ${styles.sizeSelection__label}`}
                                      >
                                        <span>Size :</span>
                                      </p>

                                      <div
                                        className={
                                          styles.sizeSelection__wrapper
                                        }
                                      >
                                        {sizes?.sizes?.map((size) => (
                                          <button
                                            type="button"
                                            key={`${size?.display}`}
                                            className={`b2 ${
                                              styles.sizeSelection__block
                                            } ${
                                              size.quantity === 0 &&
                                              !isMto &&
                                              styles[
                                                "sizeSelection__block--disable"
                                              ]
                                            } ${
                                              (size?.quantity !== 0 || isMto) &&
                                              styles[
                                                "sizeSelection__block--selectable"
                                              ]
                                            } ${
                                              selectedSize === size?.value &&
                                              styles[
                                                "sizeSelection__block--selected"
                                              ]
                                            } `}
                                            title={size?.value}
                                            onClick={() =>
                                              onSizeSelection(size)
                                            }
                                          >
                                            {size?.display}
                                            {size?.quantity === 0 && !isMto && (
                                              <svg>
                                                <line
                                                  x1="0"
                                                  y1="100%"
                                                  x2="100%"
                                                  y2="0"
                                                />
                                              </svg>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>
                            <div className={styles.sizeCartContainer}>
                              {!isSizeSelectionBlock(block) &&
                                productMeta?.sellable && (
                                  <div
                                    className={`${styles.sizeWrapper} ${
                                      isSizeCollapsed &&
                                      styles["sizeWrapper--collapse"]
                                    }`}
                                  >
                                    <OutsideClickHandler
                                      onOutsideClick={() => {
                                        setShowSizeDropdown(false);
                                      }}
                                    >
                                      <div
                                        className={` ${styles.sizeButton} ${
                                          styles.flexAlignCenter
                                        } ${styles.justifyBetween} ${styles.fontBody} ${
                                          sizes?.sizes?.length &&
                                          styles.disabledButton
                                        }`}
                                        onClick={() =>
                                          setShowSizeDropdown(!showSizeDropdown)
                                        }
                                        disabled={!sizes?.sizes?.length}
                                      >
                                        <p
                                          className={`${styles.buttonFont} ${styles.selectedSize}`}
                                          title={
                                            selectedSize
                                              ? `Size : ${selectedSize}`
                                              : "SELECT SIZE"
                                          }
                                        >
                                          {selectedSize
                                            ? `Size : ${selectedSize}`
                                            : "SELECT SIZE"}
                                        </p>
                                        <ArrowDownIcon
                                          className={`${styles.dropdownArrow} ${
                                            showSizeDropdown &&
                                            styles.rotateArrow
                                          }`}
                                        />
                                      </div>
                                      <ul
                                        className={styles.sizeDropdown}
                                        style={{
                                          display: showSizeDropdown
                                            ? "block"
                                            : "none",
                                        }}
                                      >
                                        {sizes?.sizes?.map((size) => (
                                          <li
                                            onClick={() =>
                                              onSizeSelection(size)
                                            }
                                            key={size?.value}
                                            className={`${
                                              selectedSize === size.display &&
                                              styles.selected_size
                                            } ${
                                              size.quantity === 0 && !isMto
                                                ? styles.disabled_size
                                                : styles.selectable_size
                                            }`}
                                          >
                                            {size.display}
                                          </li>
                                        ))}
                                      </ul>
                                    </OutsideClickHandler>
                                  </div>
                                )}

                              <div
                                className={`${styles.cartWrapper} ${
                                  isSizeSelectionBlock(block) &&
                                  styles["cartWrapper--half-width"]
                                }`}
                              >
                                {!disable_cart && productMeta?.sellable && (
                                  <>
                                    {singleItemDetails?.quantity &&
                                    show_quantity_control ? (
                                      <>
                                        <QuantityController
                                          isCartUpdating={isCartUpdating}
                                          count={
                                            singleItemDetails?.quantity || 0
                                          }
                                          onDecrementClick={(e) =>
                                            cartUpdateHandler(
                                              e,
                                              singleItemDetails,
                                              currentSize.value,
                                              -incrementDecrementUnit,
                                              singleItemDetails?.itemIndex,
                                              "update_item"
                                            )
                                          }
                                          onIncrementClick={(e) =>
                                            cartUpdateHandler(
                                              e,
                                              singleItemDetails,
                                              currentSize.value,
                                              incrementDecrementUnit,
                                              singleItemDetails?.itemIndex,
                                              "update_item"
                                            )
                                          }
                                          onQtyChange={(evt, currentNum) =>
                                            cartUpdateHandler(
                                              evt,
                                              singleItemDetails,
                                              currentSize.value,
                                              currentNum,
                                              singleItemDetails?.itemIndex,
                                              "edit_item"
                                            )
                                          }
                                          maxCartQuantity={
                                            singleItemDetails?.article
                                              ?.quantity ?? maxCartQuantity
                                          }
                                          minCartQuantity={minCartQuantity}
                                          containerClassName={
                                            styles.qtyContainer
                                          }
                                          inputClassName={styles.inputContainer}
                                        />
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        ref={addToCartBtnRef}
                                        className={`${styles.button} btnSecondary ${styles.flexCenter} ${styles.addToCart} ${styles.fontBody}`}
                                        onClick={(e) => {
                                          addProductForCheckout(
                                            e,
                                            selectedSize,
                                            false
                                          );
                                          setIsLaodingCart(true);
                                          setTimeout(() => {
                                            setIsLaodingCart(false);
                                          }, 1000);
                                        }}
                                        disabled={isLoadingCart}
                                      >
                                        <CartIcon className={styles.cartIcon} />
                                        ADD TO CART
                                      </button>
                                    )}
                                  </>
                                )}
                                {!productMeta?.sellable && (
                                  <button
                                    type="button"
                                    disabled
                                    className={`${styles.button} btnPrimary ${styles.notAvailable} ${styles.fontBody}`}
                                  >
                                    PRODUCT NOT AVAILABLE
                                  </button>
                                )}
                              </div>

                              {enable_buy_now?.value &&
                                isSizeSelectionBlock(block) &&
                                productMeta?.sellable && (
                                  <div
                                    className={`${styles.actionBuyNow} ${
                                      styles["actionBuyNow--ml-12"]
                                    }`}
                                  >
                                    {!disable_cart && productMeta?.sellable && (
                                      <FyButton
                                        type="button"
                                        className={`${styles.button} btnPrimary ${styles.buyNow} ${styles.fontBody}`}
                                        onClick={(e) => {
                                          addProductForCheckout(
                                            e,
                                            selectedSize,
                                            true
                                          );
                                          setIsLaodingCart(true);
                                          setTimeout(() => {
                                            setIsLaodingCart(false);
                                          }, 500);
                                        }}
                                        disabled={isLoadingCart}
                                        startIcon={
                                          <BuyNowIcon
                                            className={styles.buyNow__icon}
                                          />
                                        }
                                      >
                                        BUY NOW
                                      </FyButton>
                                    )}
                                  </div>
                                )}
                            </div>
                            {enable_buy_now?.value &&
                              !isSizeSelectionBlock(block) && (
                                <div className={styles.actionBuyNow}>
                                  {!disable_cart && productMeta?.sellable && (
                                    <FyButton
                                      type="button"
                                      className={`${styles.button} btnPrimary ${styles.buyNow} ${styles.fontBody}`}
                                      onClick={(e) => {
                                        addProductForCheckout(
                                          e,
                                          selectedSize,
                                          true
                                        );
                                        setIsLaodingCart(true);
                                        setTimeout(() => {
                                          setIsLaodingCart(false);
                                        }, 500);
                                      }}
                                      disabled={isLoadingCart}
                                      startIcon={
                                        <BuyNowIcon
                                          className={styles.buyNow__icon}
                                        />
                                      }
                                    >
                                      BUY NOW
                                    </FyButton>
                                  )}
                                </div>
                              )}
                          </div>
                        </>
                      );

                    case "size_guide":
                      return (
                        <>
                          {isSizeGuideAvailable && productMeta?.sellable && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowSizeGuide(true)}
                                className={`${styles["product__size--guide"]} ${styles.buttonFont} ${styles.fontBody}`}
                              >
                                <span>SIZE GUIDE</span>
                                <ScaleIcon className={styles.scaleIcon} />
                              </button>
                            </div>
                          )}
                        </>
                      );

                    case "custom_button":
                      return (
                        <div className={styles.customBtn}>
                          {getBlockConfigValue(block, "custom_button_text") && (
                            <FDKLink
                              to={getBlockConfigValue(
                                block,
                                "custom_button_link"
                              )}
                            >
                              <button
                                type="button"
                                className={`${styles.button} btnPrimary ${styles.buyNow} ${styles.fontBody}`}
                              >
                                {getBlockConfigValue(
                                  block,
                                  "custom_button_icon"
                                ) && (
                                  <FyImage
                                    customClass={styles.customIcon}
                                    src={getBlockConfigValue(
                                      block,
                                      "custom_button_icon"
                                    )}
                                    globalConfig={globalConfig}
                                  />
                                )}
                                {getBlockConfigValue(
                                  block,
                                  "custom_button_text"
                                )}
                              </button>
                            </FDKLink>
                          )}
                        </div>
                      );

                    case "pincode":
                      return (
                        <>
                          {productMeta?.sellable && selectedSize && (
                            <DeliveryInfo
                              className={styles.deliveryInfoBlock}
                              pincode={pincode}
                              deliveryPromise={
                                productPriceBySlug?.delivery_promise
                              }
                              selectPincodeError={selectPincodeError}
                              pincodeErrorMessage={pincodeErrorMessage}
                              setErrorMessage={setErrorMessage}
                              checkPincode={checkPincode}
                              fpi={fpi}
                              pincodeInput={pincodeInput}
                              isValidDeliveryLocation={isValidDeliveryLocation}
                              deliveryLocation={deliveryLocation}
                              isServiceabilityPincodeOnly={
                                isServiceabilityPincodeOnly
                              }
                              setPincodeErrorMessage={setPincodeErrorMessage}
                              showLogo={getBlockConfigValue(block, "show_logo")}
                            />
                          )}
                        </>
                      );

                    case "add_to_compare":
                      return (
                        <ProductCompareButton
                          customClass={styles.compareBtn}
                          fpi={fpi}
                          slug={slug}
                        />
                      );

                    case "offers":
                      return (
                        <>
                          {productMeta?.sellable &&
                            getBlockConfigValue(block, "show_offers") && (
                              <Offers
                                couponsList={coupons}
                                promotionsList={promotions}
                                setShowMoreOffers={setShowMoreOffers}
                                setSidebarActiveTab={setSidebarActiveTab}
                              />
                            )}
                        </>
                      );

                    case "prod_meta":
                      return (
                        <>
                          <ul
                            className={`${styles.productDetail} ${styles.fontBody}`}
                          >
                            {getBlockConfigValue(block, "return") && (
                              <>
                                {productPriceBySlug?.return_config
                                  ?.returnable && (
                                  <li className={styles.b2}>
                                    {`${productPriceBySlug?.return_config?.time} ${productPriceBySlug?.return_config?.unit} return`}
                                  </li>
                                )}
                                {/* v-else-if="returnConfig.returnable === false"  */}
                                {!productPriceBySlug?.return_config
                                  ?.returnable &&
                                  selectedSize && (
                                    <li className={styles.b2}>
                                      No return available on this product
                                    </li>
                                  )}
                              </>
                            )}
                            {isMto &&
                              getManufacturingTime() &&
                              selectedSize && (
                                <li className={styles.b2}>
                                  {`Shipping within ${productDetails?.custom_order?.manufacturing_time} ${productDetails?.custom_order?.manufacturing_time_unit}`}
                                </li>
                              )}
                            {/*  */}
                            {getBlockConfigValue(block, "item_code") &&
                              productDetails?.item_code && (
                                <li className={styles.b2}>
                                  Item code : {productDetails?.item_code}
                                </li>
                              )}
                          </ul>
                        </>
                      );

                    case "trust_markers":
                      return <Badges blockProps={block.props} />;

                    case "extension-binding":
                      return <BlockRenderer block={block} />;

                    default:
                      return <div>Invalid block</div>;
                  }
                })}

              {/* ---------- Product Rating ---------- */}
              {/* {getReviewRatingInfo.avg_ratings ||
                (getReviewRatingInfo.review_count && (
                  <div class="review-rating-container">
                    {getReviewRatingInfo.avg_ratings && (
                      <div class="rating-wrapper">
                        <span class="b1">
                          {getReviewRatingInfo.avg_ratings}
                        </span>
                        <SvgWrapper
                          svgSrc="star"
                          className={styles.ratingIcon}
                        />
                      </div>
                    )}
                    {getReviewRatingInfo.avg_ratings &&
                      getReviewRatingInfo.review_count && (
                        <div className={styles.separator}>&nbsp;</div>
                      )}
                    {getReviewRatingInfo.review_count && (
                      <div
                        class={`${styles.reviewWrapper} captionNormal`}
                      >
                        {getReviewRatingInfo.review_count +
                          ` Review${
                            getReviewRatingInfo.review_count > 1 ? "s" : ""
                          }`}
                      </div>
                    )}
                  </div>
                ))} */}

              {/* ---------- Prod Desc ---------- */}
              {variant_position?.value === "accordion" && (
                <div className={styles.productDescDesktop}>
                  <ProdDesc product={productDetails} config={props} />
                </div>
              )}
            </div>
          </div>
        </div>
        <ProdDesc
          customClass={
            variant_position?.value === "tabs"
              ? ""
              : styles.productDescMobileAcc
          }
          product={productDetails}
          config={props}
        />
      </div>
      {isRunningOnClient() &&
        document?.getElementById("sticky-add-to-cart") &&
        !disable_cart &&
        productMeta?.sellable &&
        isSizeWrapperAvailable &&
        createPortal(
          <StickyAddToCart
            showBuyNow={enable_buy_now?.value}
            addToCartBtnRef={addToCartBtnRef}
            productMeta={productMeta}
            selectedSize={selectedSize}
            blockProps={blockProps}
            sizes={sizes}
            getProductPrice={getProductPrice}
            addProductForCheckout={addProductForCheckout}
            onSizeSelection={onSizeSelection}
            productPriceBySlug={productPriceBySlug}
            isSizeGuideAvailable={blockProps.size_guide && isSizeGuideAvailable}
            isMto={isMto}
            deliveryInfoProps={{
              fpi,
              pincode,
              deliveryPromise: productPriceBySlug?.delivery_promise,
              selectPincodeError,
              pincodeErrorMessage,
              pincodeInput,
              isValidDeliveryLocation,
              deliveryLocation,
              isServiceabilityPincodeOnly,
              checkPincode,
              setErrorMessage,
              setPincodeErrorMessage,
              showLogo: blockProps.show_logo,
            }}
            quantityControllerProps={{
              singleItemDetails,
              show_quantity_control,
              isCartUpdating,
              cartUpdateHandler,
              currentSize,
              incrementDecrementUnit,
              minCartQuantity,
              maxCartQuantity,
            }}
          />,
          document?.getElementById("sticky-add-to-cart")
        )}
      <MoreOffers
        isOpen={showMoreOffers}
        onCloseDialog={() => setShowMoreOffers(false)}
        couponsList={coupons}
        promotionsList={promotions}
        sidebarActiveTab={sidebarActiveTab}
      />
      <SizeGuide
        isOpen={showSizeGuide}
        onCloseDialog={() => setShowSizeGuide(false)}
        customClass={styles.sizeGuide}
        productMeta={productMeta}
      />
    </>
  );
}

export const settings = {
  label: "Product Description",
  props: [
    {
      type: "product",
      name: "Product",
      id: "product",
      label: "Select a Product",
      info: "This config works on all pages except the product description page",
    },
    {
      type: "checkbox",
      id: "enable_buy_now",
      label: "Enable Buy now",
      info: "Enable buy now feature",
      default: false,
    },
    {
      type: "checkbox",
      id: "product_details_bullets",
      label: "Show Bullets in Product Details",
      default: true,
    },
    {
      type: "color",
      id: "icon_color",
      label: "Play video icon color",
      default: "#D6D6D6",
    },
    {
      type: "checkbox",
      id: "mandatory_pincode",
      label: "Mandatory Delivery check",
      default: true,
    },
    {
      type: "radio",
      id: "variant_position",
      label: "Product Detail Position",
      default: "accordion",
      options: [
        { value: "accordion", text: "Accordion style" },
        { value: "tabs", text: "Tab style" },
      ],
    },
    {
      type: "checkbox",
      id: "show_products_breadcrumb",
      label: "Show Products breadcrumb",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_category_breadcrumb",
      label: "Show Category breadcrumb",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_brand_breadcrumb",
      label: "Show Brand breadcrumb",
      default: true,
    },
    {
      type: "checkbox",
      id: "first_accordian_open",
      label: "First Accordian Open",
      default: true,
    },
    {
      id: "img_resize",
      label: "Image size for Tablet/Desktop",
      type: "select",
      options: [
        {
          value: "300",
          text: "300px",
        },
        {
          value: "500",
          text: "500px",
        },
        {
          value: "700",
          text: "700px",
        },
        {
          value: "900",
          text: "900px",
        },
        {
          value: "1100",
          text: "1100px",
        },
        {
          value: "1300",
          text: "1300px",
        },
      ],
      default: "700",
    },
    {
      id: "img_resize_mobile",
      label: "Image size for Mobile",
      type: "select",
      options: [
        {
          value: "300",
          text: "300px",
        },
        {
          value: "500",
          text: "500px",
        },
        {
          value: "700",
          text: "700px",
        },
        {
          value: "900",
          text: "900px",
        },
      ],
      default: "700",
    },
  ],
  blocks: [
    {
      type: "product_name",
      name: "Product Name",
      props: [
        {
          type: "checkbox",
          id: "show_brand",
          label: "Display Brand name",
          default: true,
        },
      ],
    },
    {
      type: "product_price",
      name: "Product Price",
      props: [
        {
          type: "checkbox",
          id: "mrp_label",
          label: "Display MRP label text",
          default: true,
        },
      ],
    },
    {
      type: "product_tax_label",
      name: "Product Tax Label",
      props: [
        {
          type: "text",
          id: "tax_label",
          label: "Price tax label text",
          default: "Price inclusive of all tax",
        },
      ],
    },
    { type: "short_description", name: "Short Description", props: [] },
    { type: "product_variants", name: "Product Variants", props: [] },
    {
      type: "seller_details",
      name: "Seller Details",
      props: [
        {
          type: "checkbox",
          id: "show_seller",
          label: "Show Seller",
          default: true,
        },
      ],
    },
    {
      type: "size_wrapper",
      name: "Size Container with Action Buttons",
      props: [
        {
          type: "checkbox",
          id: "hide_single_size",
          label: "Hide single size",
          default: false,
        },
        {
          type: "checkbox",
          id: "preselect_size",
          label: "Preselect size",
          info: "Applicable only for multiple-size products",
          default: true,
        },
        {
          type: "radio",
          id: "size_selection_style",
          label: "Size selection style",
          default: "dropdown",
          options: [
            { value: "dropdown", text: "Dropdown style" },
            { value: "block", text: "Block style" },
          ],
        },
      ],
    },
    { type: "size_guide", name: "Size Guide", props: [] },
    {
      type: "custom_button",
      name: "Custom Button",
      props: [
        {
          type: "text",
          id: "custom_button_text",
          label: "Custom Button text",
          default: "Enquire now",
          info: "Applicable for PDP Section",
        },
        {
          type: "url",
          id: "custom_button_link",
          label: "Custom Button link",
          default: "",
        },
        {
          type: "image_picker",
          id: "custom_button_icon",
          label: "Custom Button Icon",
          default: "",
          options: { aspect_ratio: "1:1", aspect_ratio_strict_check: true },
        },
      ],
    },
    {
      type: "pincode",
      name: "Pincode",
      props: [
        {
          type: "checkbox",
          id: "show_logo",
          label: "Show brand logo",
          default: true,
          info: "The pincode section will show the brand logo and name",
        },
      ],
    },
    { type: "add_to_compare", name: "Add to Compare", props: [] },
    {
      type: "offers",
      name: "Offers",
      props: [
        {
          type: "checkbox",
          id: "show_offers",
          label: "Show Offers",
          default: true,
        },
      ],
    },
    {
      type: "prod_meta",
      name: "Prod Meta",
      props: [
        { type: "checkbox", id: "return", label: "Return", default: true },
        {
          type: "checkbox",
          id: "item_code",
          label: "Show Item code",
          default: true,
        },
      ],
    },
    {
      type: "trust_markers",
      name: "Trust Markers",
      props: [
        {
          type: "image_picker",
          id: "badge_logo_1",
          label: "Badge logo 1",
          default: "",
          options: { aspect_ratio: "1:1", aspect_ratio_strict_check: true },
        },
        {
          type: "text",
          id: "badge_label_1",
          label: "Badge label 1",
          default: "",
        },
        { type: "url", id: "badge_url_1", label: "Badge URL 1", default: "" },
        {
          type: "image_picker",
          id: "badge_logo_2",
          label: "Badge logo 2",
          default: "",
          options: { aspect_ratio: "1:1", aspect_ratio_strict_check: true },
        },
        {
          type: "text",
          id: "badge_label_2",
          label: "Badge label 2",
          default: "",
        },
        { type: "url", id: "badge_url_2", label: "Badge URL 2", default: "" },
        {
          type: "image_picker",
          id: "badge_logo_3",
          label: "Badge logo 3",
          default: "",
          options: { aspect_ratio: "1:1", aspect_ratio_strict_check: true },
        },
        {
          type: "text",
          id: "badge_label_3",
          label: "Badge label 3",
          default: "",
        },
        { type: "url", id: "badge_url_3", label: "Badge URL 3", default: "" },
        {
          type: "image_picker",
          id: "badge_logo_4",
          label: "Badge logo 4",
          default: "",
          options: { aspect_ratio: "1:1", aspect_ratio_strict_check: true },
        },
        {
          type: "text",
          id: "badge_label_4",
          label: "Badge label 4",
          default: "",
        },
        { type: "url", id: "badge_url_4", label: "Badge URL 4", default: "" },
        {
          type: "image_picker",
          id: "badge_logo_5",
          label: "Badge logo 5",
          default: "",
          options: { aspect_ratio: "1:1", aspect_ratio_strict_check: true },
        },
        {
          type: "text",
          id: "badge_label_5",
          label: "Badge label 5",
          default: "",
        },
        { type: "url", id: "badge_url_5", label: "Badge URL 5", default: "" },
      ],
    },
  ],
  preset: {
    blocks: [
      { name: "Product Name" },
      { name: "Product Price" },
      { name: "Product Tax Label" },
      { name: "Short Description" },
      { name: "Seller Details" },
      { name: "Size Guide" },
      { name: "Custom Button" },
      { name: "Pincode" },
      { name: "Product Variants" },
      { name: "Add to Compare" },
      { name: "Offers" },
      { name: "Prod Meta" },
      { name: "Size Container with Action Buttons" },
    ],
  },
};

Component.serverFetch = async ({ fpi, router, props }) => {
  const isPDP = /^\/product\/[^/]+\/?$/.test(router.pathname);
  const slug = isPDP ? router?.params?.slug : props?.product?.value;

  if (slug) {
    const values = { slug };

    fpi.custom.setValue("isPdpSsrFetched", true);
    fpi.custom.setValue("isProductNotFound", false);

    return fpi.executeGQL(GET_PRODUCT_DETAILS, values).then((result) => {
      if (result.errors && result.errors.length) {
        fpi.custom.setValue("isProductNotFound", true);
      } else {
        fpi.custom.setValue(
          "productPromotions",
          result?.data?.promotions || {}
        );
      }
      return result;
    });
  }
};

export default Component;
