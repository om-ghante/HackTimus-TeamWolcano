import React, { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import Modal from "@gofynd/theme-template/components/core/modal/modal";
import "@gofynd/theme-template/components/core/modal/modal.css";
import QuantityController from "@gofynd/theme-template/components/quantity-control/quantity-control";
import "@gofynd/theme-template/components/quantity-control/quantity-control.css";
import DeliveryInfo from "../delivery-info/delivery-info";
import SizeGuide from "../../size-guide/size-guide";
import styles from "./sticky-addtocart.less";
import CartIcon from "../../../../assets/images/cart.svg";
import BuyNowIcon from "../../../../assets/images/buy-now.svg";
import ScaleIcon from "../../../../assets/images/scale.svg";

const StickyAddToCart = ({
  productMeta,
  selectedSize,
  onSizeSelection,
  blockProps,
  sizes,
  getProductPrice,
  addProductForCheckout,
  productPriceBySlug,
  isSizeGuideAvailable,
  deliveryInfoProps,
  showBuyNow,
  quantityControllerProps,
  isMto,
}) => {
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [modalType, setModalType] = useState("");

  const {
    singleItemDetails,
    show_quantity_control,
    isCartUpdating,
    cartUpdateHandler,
    currentSize,
    incrementDecrementUnit,
    minCartQuantity,
    maxCartQuantity,
  } = quantityControllerProps;

  const openSizeModal = (e, modalType) => {
    if (
      selectedSize &&
      deliveryInfoProps?.pincode &&
      deliveryInfoProps?.isValidDeliveryLocation
    ) {
      cartHandler(e, modalType === "buy-now");
    } else {
      e.preventDefault();
      setShowSizeModal(true);
      setModalType(modalType);
    }
  };
  const cartHandler = async (e, isBuyNow) => {
    addProductForCheckout(e, selectedSize, isBuyNow);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          className={`${styles.stickyAddtocart} ${showSizeGuide && styles["stickyAddtocart--zIndex"]}`}
          key="add-to-cart-container"
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: "0%" }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ duration: 0.5 }}
        >
          <button
            type="button"
            className={`btnSecondary ${styles.button}`}
            onClick={(e) => openSizeModal(e, "add-to-cart")}
          >
            <CartIcon className={styles.cartIcon} />
            ADD TO CART
          </button>
        </motion.div>
        {showBuyNow && (
          <motion.div
            className={`${styles.stickyAddtocart} ${showSizeGuide && styles["stickyAddtocart--zIndex"]}`}
            key="buy-now-container"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: "0%" }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.5 }}
          >
            <button
              type="button"
              className={`${styles.button} btnPrimary`}
              onClick={(e) => openSizeModal(e, "buy-now")}
            >
              <BuyNowIcon className={styles.cartIcon} />
              Buy Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.addToCartModal}>
        <Modal
          isOpen={showSizeModal}
          title="Select Size"
          closeDialog={() => setShowSizeModal(false)}
          headerClassName={styles.customMHeader}
          bodyClassName={styles.customMBody}
          isCancellable={false}
        >
          <div>
            <div className={styles.guideCta}>
              <span style={{ width: "65%" }}>
                {selectedSize
                  ? `Style : Size (${selectedSize})`
                  : "SELECT SIZE"}
              </span>
              {isSizeGuideAvailable && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSizeGuide(true);
                    }}
                    className={styles["product__size--guide"]}
                  >
                    <span>SIZE GUIDE</span>
                    <ScaleIcon className={styles.scaleIcon} />
                  </button>
                </>
              )}
            </div>

            <div className={styles.sizes}>
              <ul>
                {sizes?.sizes?.map?.((size, index) => (
                  <li
                    key={index}
                    onClick={() => onSizeSelection(size)}
                    className={`${styles.product__size} ${selectedSize === size.display && styles["product__size--selected"]} ${size.quantity === 0 && !isMto && styles["product__size--disabled"]}`}
                  >
                    {size.display.length < 15
                      ? size.display
                      : `${size.display.substring(0, 15)}...`}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.priceBlock}>
            <div className={styles.productPrice}>
              {getProductPrice("effective") &&
                blockProps?.mrp_label &&
                getProductPrice("effective") === getProductPrice("marked") && (
                  <span className="mrp-label">MRP:</span>
                )}
              <h4 className={styles["productPrice--effective"]}>
                {getProductPrice("effective")}
              </h4>

              {getProductPrice("marked") &&
                blockProps?.mrp_label &&
                getProductPrice("effective") !== getProductPrice("marked") && (
                  <>
                    <span className={styles.mrpLabel}>MRP:</span>
                    <span className={styles["productPrice--marked"]}>
                      {getProductPrice("marked")}
                    </span>
                  </>
                )}

              {productPriceBySlug?.discount && (
                <span className={styles["productPrice--discount"]}>
                  {productPriceBySlug?.discount}
                </span>
              )}
            </div>

            {blockProps?.tax_label && (
              <div className={`${styles["caption-normal"]} ${styles.taxLabel}`}>
                {blockProps?.tax_label}
              </div>
            )}
          </div>

          {selectedSize && <DeliveryInfo {...deliveryInfoProps} />}

          {modalType === "add-to-cart" && (
            <>
              {singleItemDetails?.quantity && show_quantity_control ? (
                <>
                  <QuantityController
                    isCartUpdating={isCartUpdating}
                    count={singleItemDetails?.quantity || 0}
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
                      singleItemDetails?.article?.quantity ?? maxCartQuantity
                    }
                    minCartQuantity={minCartQuantity}
                    containerClassName={styles.qtyContainer}
                    inputClassName={styles.inputContainer}
                  />
                </>
              ) : (
                <button
                  type="button"
                  className={`btnSecondary ${styles.button}`}
                  onClick={(e) => cartHandler(e, false)}
                  disabled={!productMeta.sellable}
                >
                  <CartIcon className={styles.cartIcon} />
                  ADD TO CART
                </button>
              )}
            </>
          )}

          {modalType === "buy-now" && (
            <button
              type="button"
              className={`btnPrimary ${styles.button}`}
              onClick={(e) => cartHandler(e, true)}
              disabled={!productMeta.sellable}
            >
              <BuyNowIcon className={styles.cartIcon} />
              Buy Now
            </button>
          )}
        </Modal>
        {isSizeGuideAvailable && (
          <SizeGuide
            customClass={styles.sizeGuide}
            isOpen={showSizeGuide}
            onCloseDialog={(e) => {
              e.preventDefault();
              setShowSizeGuide(false);
            }}
            productMeta={productMeta}
          />
        )}
      </div>
    </>
  );
};

export default StickyAddToCart;
