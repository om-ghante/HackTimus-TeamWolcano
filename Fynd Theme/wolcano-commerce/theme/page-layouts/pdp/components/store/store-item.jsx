// StoreItem.js
import React from "react";
import PropTypes from "prop-types";

import styles from "./store-item.less";
import { currencyFormat } from "../../../../helper/utils";

function StoreItem({ storeitem, buybox, onSelectStoreItem }) {
  const getStoreLabel = () => {
    const isSellerListing = buybox?.is_seller_buybox_enabled; // Hardcoded for testing purpose

    return isSellerListing ? storeitem?.seller?.name : storeitem?.store?.name;
  };

  const getDeliveryDate = () => {
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };

    const { min, max } = storeitem?.delivery_promise || {};

    if (!min) return false;

    const dateFormatter = new Intl.DateTimeFormat(undefined, options);
    const minDate = dateFormatter.format(new Date(min));
    const maxDate = dateFormatter.format(new Date(max));

    return `${min === max ? minDate : `${minDate} - ${maxDate}`}`;
  };

  const getProductPrice = (key) => {
    if (storeitem && storeitem.price) {
      const { is_set } = storeitem;
      if (is_set) {
        const pricePerPiece = storeitem?.price_per_piece;
        return currencyFormat(
          pricePerPiece[key],
          pricePerPiece?.currency_symbol
        );
      }
      return currencyFormat(
        storeitem.price[key],
        storeitem.price.currency_symbol
      );
    }
  };

  const selectStoreItem = (event, isBuyNow) => {
    onSelectStoreItem(event, storeitem, isBuyNow);
  };

  return (
    <div className={styles.storeItemWrapper}>
      <p className={`${styles.storeItemWrapperSold} ${styles.b4}`}>
        Sold by: <span className={styles.sh4}>{getStoreLabel()}</span>
      </p>
      <div className={styles.priceWrapper}>
        <span className={`${styles.effective} ${styles.sh4}`}>
          {getProductPrice("effective")}
        </span>
        {getProductPrice("effective") !== getProductPrice("marked") && (
          <span className={`${styles.marked} captionNormal`}>
            {getProductPrice("marked")}
          </span>
        )}
        <span className={`${styles.discount} ${styles.sh4}`}>
          {storeitem.discount}
        </span>
      </div>
      {getDeliveryDate() && (
        <p className={`${styles.storeItemWrapperDelivery} ${styles.b4}`}>
          {getDeliveryDate()}
        </p>
      )}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={`${styles.button} btnSecondary ${styles.flexCenter} ${styles.addToCart} ${styles.fontBody}`}
          onClick={(event) => selectStoreItem(event, false)}
        >
          ADD TO CART
        </button>
        <button
          type="button"
          className={`${styles.button} btnPrimary ${styles.buyNow} ${styles.fontBody}`}
          onClick={(event) => selectStoreItem(event, true)}
        >
          BUY NOW
        </button>
      </div>
    </div>
  );
}

StoreItem.propTypes = {
  onSelectStoreItem: PropTypes.func,
};

export default StoreItem;
