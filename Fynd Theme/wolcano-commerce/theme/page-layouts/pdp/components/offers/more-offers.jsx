import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "@gofynd/theme-template/components/core/modal/modal";
import styles from "./more-offers.less";
import { HTMLContent } from "../../../marketing/HTMLContent";
import "@gofynd/theme-template/components/core/modal/modal.css";

function MoreOffers({
  isOpen,
  couponsList,
  promotionsList,
  sidebarActiveTab,
  onCloseDialog,
}) {
  const [activeTab, setActiveTab] = useState("coupons");

 useEffect(() => {
    if (isOpen) {
      if (sidebarActiveTab === "coupons" && couponsList.length > 0) {
        setActiveTab("coupons");
      } else if (sidebarActiveTab === "promotions" && promotionsList.length > 0) {
        setActiveTab("promotions");
      } else {
        setActiveTab(couponsList.length > 0 ? "coupons" : "promotions");
      }
    }
  }, [isOpen, sidebarActiveTab, couponsList, promotionsList]);

  const closeDialog = () => {
    onCloseDialog();
  };

  const getListingItems = () => {
    if (activeTab === "coupons") {
      return couponsList.map((coupon) => ({
        ...coupon,
        title: coupon.coupon_code || "",
        subtitle: coupon.title || "",
        bodyText: coupon.description || "",
      }));
    } else {
      return promotionsList.map((promo) => ({
        ...promo,
        title: promo.promotion_name || "",
        subtitle: promo.offer_text || "",
        bodyText: promo.description || "",
      }));
    }
  };

  return (
    <Modal
      modalType="right-modal"
      isOpen={isOpen}
      title="Best Offers"
      closeDialog={() => closeDialog(false)}
      headerClassName={styles.sidebarHeader}
      bodyClassName={styles.moreOffersContainer}
    >
      <div className={styles.sizeTabs}>
        {couponsList.length > 0 && (
          <button
            type="button"
            className={`b2 ${styles.tab} ${activeTab === "coupons" ? styles.active : ""}`}
            onClick={() => setActiveTab("coupons")}
          >
            Coupons
          </button>
        )}
        {promotionsList.length > 0 && (
          <button
            type="button"
            className={`b2 ${styles.tab} ${activeTab === "promotions" ? styles.active : ""}`}
            onClick={() => setActiveTab("promotions")}
          >
            Promotions
          </button>
        )}
      </div>

      <div className={styles.sidebarBody}>
        <div
          className={`${styles.sidebarBodyWrapper} ${!getListingItems().length ? styles.flexCenter : ""}`}
        >
          {getListingItems().length > 0 ? (
            getListingItems().map((item, index) => (
              <div className={styles.offerCard} key={index}>
                {(!!item.title || !!item.subtitle) && (
                  <div className={styles.offerCardHead}>
                    {item.title && (
                      <h4 className={styles.offerCardCode}>{item.title}</h4>
                    )}
                    {item.subtitle && (
                      <p className={`${styles.offerCardTitle} h5`}>
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                )}
                {item.bodyText && (
                  <HTMLContent
                    content={item.bodyText}
                    className={`${styles.offerCardDescription} b1`}
                  />
                )}
              </div>
            ))
          ) : (
            <h3 className={styles.fontHeader}>No {activeTab} available</h3>
          )}
        </div>
      </div>
    </Modal>
  );
}

MoreOffers.propTypes = {
  isOpen: PropTypes.bool,
  couponsList: PropTypes.arrayOf(
    PropTypes.shape({
      coupon_code: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
  promotionsList: PropTypes.arrayOf(
    PropTypes.shape({
      promotion_name: PropTypes.string.isRequired,
      offer_text: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
  sidebarActiveTab: PropTypes.string,
  onCloseDialog: PropTypes.func,
};

export default MoreOffers;
