import React, { useCallback, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import OrdersHeader from "@gofynd/theme-template/components/order-header/order-header";
import "@gofynd/theme-template/components/order-header/order-header.css";
import ShipmentUpdateItem from "@gofynd/theme-template/components/shipments-update-item/shipments-update-item";
import "@gofynd/theme-template/components/shipments-update-item/shipments-update-item.css";
import BeneficiaryList from "@gofynd/theme-template/components/beneficiary-list/beneficiary-list";
import "@gofynd/theme-template/components/beneficiary-list/beneficiary-list.css";
import BeneficiaryItem from "@gofynd/theme-template/components/beneficiary-list/beneficiary-list-item/beneficiary-list-item";
import "@gofynd/theme-template/components/beneficiary-list/beneficiary-list-item/beneficiary-list-item.css";
import ReasonsList from "@gofynd/theme-template/components/reasons-list/reasons-list";
import "@gofynd/theme-template/components/reasons-list/reasons-list.css";
import ReasonItem from "@gofynd/theme-template/components/reasons-list/reason-item/reason-item";
import "@gofynd/theme-template/components/reasons-list/reason-item/reason-item.css";
import styles from "./styles/profile-shipment-update-page.less";
import useShipmentDetails from "../orders/useShipmentDetails";
import useRefundDetails from "../orders/useRefundDetails";
import { useSnackbar } from "../../helper/hooks";
import EmptyState from "../../components/empty-state/empty-state";
import Loader from "../../components/loader/loader";
import ProfileRoot from "../../components/profile/profile-root";
import AddPayment from "../../components/orders/add-payment";
import {
  COMPLETE_MEDIA_UPLOAD,
  START_MEDIA_UPLOAD,
} from "../../queries/shipmentQuery";
import ArrowDropdownIcon from "../../assets/images/arrow-dropdown-black.svg";
import CrossContainedIcon from "../../assets/images/cross-contained-black.svg";

function ProfileShipmentUpdatePage({ fpi }) {
  const navigate = useNavigate();
  const location = useLocation();
  const DEFAULT_ERROR_TEXT = "Something went wrong";
  const [updatedQty, setUpdatedQty] = useState("");
  const [selectedBagId, setSelectedBagId] = useState("");
  const [extraComment, setExtraComment] = useState("");
  const [type, setType] = useState("");
  const [reasonList, setReasonsList] = useState([]);
  const [previewList, setPreviewList] = useState([]);
  const [imageList, setImageList] = useState([]);
  const [accordianlv1, setAccordianlv1] = useState({});
  const [selectedReason, setSelectedReason] = useState({});
  const [showReasonsAccordion, setShowReasonsAccordion] = useState({ 0: true });
  const [selectedBeneficary, setSelectedBeneficary] = useState(null);
  const [showBeneficiariesAccordion, setShowBeneficiariesAccordion] =
    useState(false);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState("Something went wrong");
  const [reasonOtherText, setReasonOtherText] = useState("");
  const { showSnackbar } = useSnackbar();
  const {
    isLoading,
    shipmentDetails,
    reasonsList,
    getBagReasons,
    updateShipment,
  } = useShipmentDetails(fpi);
  const { refundDetails, getRefundDetails } = useRefundDetails(fpi);

  const queryParams = new URLSearchParams(location.search);
  const selected_bag_id = queryParams.get("selectedBagId") || "";
  const updateType = (cancelBtn) => {
    if (shipmentDetails) {
      if (shipmentDetails?.can_cancel) {
        if (cancelBtn === "cancelBtn") {
          return "Cancel";
        } else {
          return "Cancel Request";
        }
      } else if (shipmentDetails?.can_return) {
        if (cancelBtn === "cancelBtn") {
          return "Return";
        } else {
          return "Return Request";
        }
      }
      return "";
    }
  };
  useEffect(() => {
    if (shipmentDetails?.order_id) {
      getBagReasons({
        shipmentId: shipmentDetails?.shipment_id,
        bagId: selected_bag_id,
      });
      getRefundDetails(shipmentDetails?.order_id);
    }
    return () => {};
  }, [shipmentDetails?.order_id]);

  useEffect(() => {
    setAccordianlv1({
      0: reasonsList.reasons,
    });
    return () => {};
  }, [reasonsList]);
  useEffect(() => {
    if (shipmentDetails) {
      const bags = shipmentDetails?.bags;
      const filterBag = bags?.filter(
        (item) => item.id === Number(selected_bag_id)
      );
      const finalbag = filterBag?.map((item) => {
        return {
          ...item,
          bag_ids: [selected_bag_id],
        };
      });
      setUpdatedQty(finalbag?.[0]?.quantity);
    }
  }, [shipmentDetails?.bags]);
  const getBag = useMemo(() => {
    if (shipmentDetails) {
      const bags = shipmentDetails?.bags;
      const filterBag = bags?.filter(
        (item) => item.id === Number(selected_bag_id)
      );
      const finalbag = filterBag?.map((item) => {
        return {
          ...item,
          bag_ids: [selected_bag_id],
        };
      });
      return finalbag;
    }
  }, [shipmentDetails?.bags]);

  const updatedQuantity = (qty) => {
    setUpdatedQty(qty);
  };

  const onDontUpdate = () => {
    navigate(`/profile/orders/shipment/${shipmentDetails?.shipment_id}`);
  };
  const showimg = () => {
    return (
      selectedReason[selectLast()]?.reasons?.length === 0 &&
      getStatusForUpdate() === "return_pre_qc"
    );
  };

  const selectLast = () => {
    return Object.keys(selectedReason)[Object.keys(selectedReason).length - 1];
  };
  const getStatusForUpdate = () => {
    if (shipmentDetails?.can_cancel) {
      return "cancelled_customer";
    } else if (shipmentDetails?.can_return) {
      return selectedReason?.[selectLast()]?.qc_type?.includes?.("pre_qc")
        ? "return_pre_qc"
        : "return_initiated";
    }
  };
  const toggelAccordian = (idx, status) => {
    const obj = {};
    // explicitly close the accordian if close status is given
    if (status === "close") {
      obj[idx] = false;
    }
    // explicitly Open the accordian if open status is given
    else if (status === "open") {
      obj[idx] = true;
    }
    // Toggle accordian if status not given & Only one accordian will be open at a time
    else {
      for (const key in showReasonsAccordion) {
        if (+key === +idx) {
          obj[idx] = !showReasonsAccordion[idx];
        } else {
          obj[key] = false;
        }
      }
    }
    setShowReasonsAccordion((oldValue) => ({ ...oldValue, ...obj }));
  };
  const onReasonChange = (reason, idx) => {
    const listObj = deleteNext(accordianlv1, idx);
    if (reason?.reasons?.length > 0) {
      setAccordianlv1({
        ...listObj,
        [+idx + 1]: reason.reasons,
      });
    } else {
      setAccordianlv1({ ...listObj });
    }
    const selectObj = deleteNext(selectedReason, idx);

    setSelectedReason({
      ...selectObj,
      [+idx]: reason,
    });

    const obj = { ...showReasonsAccordion };

    // On Selecting reason close All past Accordian and open next Reason accordian
    // basically one accordian at a time will be opened.
    for (const key in obj) {
      if (+key < +idx + 1) {
        toggelAccordian(+key, "close");
      }
    }

    toggelAccordian(+idx + 1, "open");
  };

  const onOtherReason = (event, i) => {
    setReasonOtherText(event);
  };
  const beneficiaryError = () => {
    return refundDetails?.user_beneficiaries_detail?.beneficiaries?.length > 0
      ? "Please select any one refund option"
      : "Please add a payment method";
  };
  const showSuccess = (type) => {
    if (type === "payment") {
      getRefundDetails(shipmentDetails?.order_id);
    } else if (type === "refund") {
      redirectToOrders();
    }
    setType(type);
  };
  const getBeneficiaryDetails = () => {
    getRefundDetails(shipmentDetails?.order_id);
  };
  const onBeneficiariesChange = (beneficiary) => {
    setSelectedBeneficary(beneficiary);
  };

  const deleteNext = (obj, idx) => {
    const select = { ...obj };
    for (const key in select) {
      if (+key > +idx) {
        delete select[key];
      }
    }
    return select;
  };
  const buttondisable = useMemo(() => {
    return shipmentDetails?.can_cancel
      ? !(selectLast() && !selectedReason[selectLast()].reasons?.length > 0)
      : !(
          selectLast() &&
          !selectedReason[selectLast()].reasons?.length > 0 &&
          (showimg() ? imageList.length > 0 : true)
        );
  }, [shipmentDetails, selectedReason, imageList]);
  const getUpdatedBagsList = () => {
    const arrBags = [];

    // for (let i = 0; i < getBag.length; i++) {
    //   if (refs?.current[i]?.getUpdatedBags())
    //     arrBags = arrBags.concat(refs?.current[i]?.getUpdatedBags());
    // }
    return arrBags;
  };
  const getProductDetails = () => {
    const quantity = updatedQty;
    const line_number = getBag?.[0].line_number;
    const identifier = getBag?.[0].seller_identifier;
    const productsArr = [{ quantity, line_number, identifier }];
    return productsArr;
  };

  const getUpdateConfigParams = (reason, cdn_urls) => {
    const getProducts = getProductDetails();

    if (shipmentDetails?.can_cancel) {
      return {
        shipmentId: shipmentDetails?.shipment_id,
        updateShipmentStatusRequestInput: {
          force_transition: true,

          statuses: [
            {
              shipments: [
                {
                  identifier: shipmentDetails?.shipment_id,
                  products: getProducts,
                  reasons: {
                    products: [
                      {
                        data: {
                          reason_id: reason[selectLast()]?.id,
                          reason_text:
                            reason[selectLast()]?.reason_other_text ||
                            reasonOtherText,
                        },
                        filters: getProducts,
                      },
                    ],
                  },
                },
              ],
              status: "cancelled_customer",
            },
          ],
        },
        order_id: shipmentDetails?.order_id,
        products: getProducts,
        selected_reason: { ...reason[selectLast()] },
        other_reason_text: extraComment,
      };
    } else {
      return {
        shipmentId: shipmentDetails?.shipment_id,
        updateShipmentStatusRequestInput: {
          force_transition: true,

          statuses: [
            {
              shipments: [
                {
                  data_updates: {
                    products: [
                      {
                        data: {
                          meta: {
                            return_qc_json: {
                              images: cdn_urls,
                            },
                          },
                        },
                      },
                    ],
                  },
                  identifier: shipmentDetails?.shipment_id,
                  products: getProducts,
                  reasons: {
                    products: [
                      {
                        data: {
                          reason_id: reason[selectLast()]?.id,
                          reason_text:
                            reason[selectLast()]?.reason_other_text ||
                            reasonOtherText,
                        },
                        filters: getProducts,
                      },
                    ],
                  },
                },
              ],
              status: getStatusForUpdate(),
            },
          ],
        },
        shimpment_id: shipmentDetails?.shipment_id,
        order_id: shipmentDetails?.order_id,
        selected_reason: { ...reason[selectLast()] },
        other_reason_text: extraComment,
        beneficiary_id: refundDetails?.user_beneficiaries_detail
          ?.show_beneficiary_details
          ? selectedBeneficary?.beneficiary_id
          : "",
        qc_image_urls: cdn_urls,
        products: getProducts,
      };
    }
    return {
      shipmentId: shipmentDetails?.shipment_id,
      updateShipmentStatusRequestInput: {
        force_transition: true,

        statuses: [
          {
            shipments: [
              {
                identifier: shipmentDetails?.shipment_id,
                products: getProducts,
                reasons: {
                  products: [
                    {
                      data: {
                        reason_id: reason[selectLast()]?.id,
                        reason_text:
                          reason[selectLast()]?.reason_other_text ||
                          reasonOtherText,
                      },
                      filters: getProducts,
                    },
                  ],
                },
              },
            ],
            status: "return_initiated",
          },
        ],
      },
      shimpment_id: shipmentDetails?.shipment_id,
      order_id: shipmentDetails?.order_id,
      selected_reason: { ...reason[selectLast()] },
      other_reason_text: extraComment,
      beneficiary_id: refundDetails?.user_beneficiaries_detail
        ?.show_beneficiary_details
        ? selectedBeneficary?.beneficiary_id
        : "",
      qc_image_urls: cdn_urls,
      products: getProducts,
    };
  };

  const setUpdatedOrders = (obj) => {
    setInProgress(true);
    if (shipmentDetails?.can_cancel) {
      updateShipment(obj, "cancel");
    }
    if (shipmentDetails?.can_return) {
      updateShipment(obj, "return");
    }
  };
  const redirectToOrders = () => {
    navigate(`/profile/orders?selected_date_filter=730`);
  };
  const showUpdateErrorText = (text) => {
    setConfirmReturn(false);
    setUpdateError(true);
    setInProgress(false);
    window.scrollTo(0, 0);
    if (text) {
      showSnackbar(text.toString(), "error");
    } else {
      showSnackbar(DEFAULT_ERROR_TEXT, "error");
    }
  };
  const onUpdate = async () => {
    let cdnUrls = [];

    if (getStatusForUpdate() === "return_pre_qc") {
      const images = imageList.filter((item) =>
        ["image/png", "image/jpg", "image/jpeg"].includes(item.type)
      );
      const videos = imageList.filter((item) =>
        ["video/quicktime", "video/mp4"].includes(item.type)
      );
      if (images.length > 4)
        return showUpdateErrorText("Maximum 4 images are allowed to upload");
      if (videos.length > 1)
        return showUpdateErrorText("Maximum 1 video is allowed to upload");
      if (images.length < 2)
        return showUpdateErrorText("Minimum 2 images are required to upload");

      const filesizecheck = images.every((item) => item.size / 1000 < 5000);

      if (!filesizecheck)
        return showUpdateErrorText("Image size should not be more than 5MB");
      if (videos?.length) {
        const filesizecheckvideo = videos.every(
          (item) => item.size / 1000 < 25000
        );

        if (!filesizecheckvideo)
          return showUpdateErrorText("video size should not be more than 25MB");
      }

      const filetype = imageList.every((item) =>
        [
          "image/png",
          "image/jpg",
          "image/jpeg",
          "video/quicktime",
          "video/mp4",
        ].includes(item.type)
      );
      if (!filetype)
        return showUpdateErrorText(
          "Only JPG,PNG images and MOV,MP4 videos are supported. Please upload a valid file."
        );
    }

    // if (!confirmReturn) {
    //   setConfirmReturn(true);
    //   return;
    // }
    if (getStatusForUpdate() === "return_pre_qc") {
      setInProgress(true);

      const startUploadResponse = await Promise.all(
        imageList.map((item) => {
          return fpi.executeGQL(START_MEDIA_UPLOAD, {
            startUploadReqInput: {
              file_name: item.name,
              content_type: item.type,
              size: item.size,
            },
            namespace: "misc",
          });
        })
      );

      await Promise.all(
        startUploadResponse.map((mediaObj, index) => {
          const item = mediaObj.data?.startUpload || {};

          return fetch(item.upload?.url, {
            method: item.method,
            body: imageList[index].file,
            headers: {
              "Content-Type": item.content_type,
            },
          });
        })
      );

      const completeUploadResponse = await Promise.all(
        startUploadResponse.map((mediaObj) => {
          const item = mediaObj.data?.startUpload || {};

          return fpi.executeGQL(COMPLETE_MEDIA_UPLOAD, {
            completeUploadReqInput: {
              file_name: item.file_name,
              file_path: item.file_path,
              content_type: item.content_type,
              method: item.method,
              namespace: item.namespace,
              operation: item.operation,
              size: item.size,
              upload: item.upload,
            },
            namespace: "misc", // Storage location
          });
        })
      );

      setInProgress(false);
      cdnUrls = completeUploadResponse.map((item) => {
        return { desc: "", url: item.data?.completeUpload?.cdn?.url };
      });
    }

    const reason = selectedReason;
    // let updateBags = getUpdatedBagsList();
    // if (updateBags.length === 0) {
    //   return showUpdateErrorText("No Items to return");
    // } else
    if (reason[0]?.display_name === "Others" && reasonOtherText.length <= 0) {
      return showUpdateErrorText(
        "Please write a reason for cancellation, as it will help us serve you better"
      );
    }
    if (!reason) {
      return showUpdateErrorText("Please select any one of the below reason");
    }
    if (
      !selectedBeneficary &&
      shipmentDetails?.can_return &&
      shipmentDetails?.beneficiary_details &&
      refundDetails?.user_beneficiaries_detail?.show_beneficiary_details
    ) {
      return showUpdateErrorText(beneficiaryError());
    }

    const config = getUpdateConfigParams(reason, cdnUrls);
    setUpdatedOrders(config);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);

    if (!files?.length) return;

    let showFileExistError = false;

    const newFiles = files
      .map((file) => {
        const fileExists = imageList.some(
          (uploadedFile) => uploadedFile.name === file.name
        );

        if (fileExists) {
          showFileExistError = true;
          return null;
        }

        return {
          id: Date.now() + file.name, // Unique ID for each file
          name: file.name,
          type: file.type,
          size: file.size,
          preview: URL.createObjectURL(file),
          file,
        };
      })
      .filter((file) => file);

    setImageList((prevList) => [...prevList, ...newFiles]);

    if (showFileExistError) {
      showSnackbar("File already exists", "error");
    }

    event.target.value = null;
  };

  const handleRemoveFile = (id) => {
    // Revoke URL for the removed file to free memory
    const removedFile = imageList.find((file) => file.id === id);
    if (removedFile) URL.revokeObjectURL(removedFile.preview);

    setImageList((prevList) => prevList.filter((file) => file.id !== id));
  };

  return (
    <ProfileRoot fpi={fpi}>
      {isLoading ? (
        <Loader />
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.5 } },
          }}
          initial="hidden"
          animate="visible"
          className="basePageContainer"
        >
          {!shipmentDetails && (
            <div className={`${styles.error} ${styles.shipment}`}>
              <EmptyState></EmptyState>
            </div>
          )}
          {shipmentDetails && (
            <div className={` ${styles.shipment}`}>
              {shipmentDetails && (
                <OrdersHeader
                  flag={true}
                  title={`${updateType()}`}
                  customClassName={styles.headerWidth}
                ></OrdersHeader>
              )}
              {getBag?.map(
                (item, index) => (
                  <ShipmentUpdateItem
                    key={`shipment_item${index}`}
                    selectedBagId={selected_bag_id}
                    updatedQuantity={(e) => updatedQuantity(e)}
                    item={item}
                  ></ShipmentUpdateItem>
                )
                //   }
              )}
              {/* <div className={`${styles.divider}`}></div> */}
              <div className={`${styles.reasonsList}`}>
                {Object.values(accordianlv1).map((item, i) => (
                  <div
                    className={`${styles.accordion} ${styles.borderBottom}`}
                    key={i}
                  >
                    <div
                      className={`${styles.accordion} ${styles.accordion__header}`}
                      onClick={() => {
                        if (item?.length > 1) toggelAccordian(i);
                      }}
                    >
                      <OrdersHeader
                        flag={true}
                        className={`${styles.refundTitle}`}
                        customClassName={`${styles.headerWidth} ${styles.unsetPadding}`}
                        title={
                          i === 0
                            ? `Reason for ${updateType()?.toLowerCase()}`
                            : "More Details"
                        }
                      ></OrdersHeader>
                      {item?.length > 1 && (
                        <ArrowDropdownIcon
                          className={`${showReasonsAccordion[i] ? styles.rotate : ""} ${styles.animate}`}
                        />
                      )}
                    </div>
                    {showReasonsAccordion[i] && (
                      <ReasonsList
                        reasons={item}
                        change={(e) => onReasonChange(e, i)}
                        selectedReason={selectedReason[i]}
                        otherReason={(e) => onOtherReason(e, i)}
                      ></ReasonsList>
                    )}
                    {selectedReason[i]?.id && !showReasonsAccordion[i] && (
                      <div className={`${styles.selectedReason}`}>
                        <ReasonItem
                          reason={selectedReason[i]}
                          selectedReason={selectedReason[i]}
                          otherReason={(e) => onOtherReason(e, i)}
                        ></ReasonItem>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {shipmentDetails?.beneficiary_details &&
                shipmentDetails?.can_return &&
                refundDetails?.user_beneficiaries_detail
                  ?.show_beneficiary_details && (
                  <div className={`${styles.divider}`}></div>
                )}
              {shipmentDetails?.beneficiary_details &&
                shipmentDetails?.can_return &&
                refundDetails?.user_beneficiaries_detail
                  ?.show_beneficiary_details && (
                  <div>
                    <div className={styles.refundOption}>
                      Select refund option
                    </div>
                    {/* <ukt-accordion> */}
                    <div>
                      <BeneficiaryList
                        className={`${styles.beneficiaryList}`}
                        beneficiaries={
                          refundDetails?.user_beneficiaries_detail
                            ?.beneficiaries || []
                        }
                        change={onBeneficiariesChange}
                        selectedBeneficiary={selectedBeneficary}
                      ></BeneficiaryList>
                      {shipmentDetails && (
                        <AddPayment
                          shipment={shipmentDetails}
                          fpi={fpi}
                          getBeneficiaryDetails={getBeneficiaryDetails}
                        ></AddPayment>
                      )}
                    </div>
                    {/* // </ukt-accordion> */}
                    {/* {selectedBeneficary && (
                    <BeneficiaryItem
                      beneficiary={selectedBeneficary}
                      selectedBeneficiary={selectedBeneficary}
                    ></BeneficiaryItem>
                  )} */}
                  </div>
                )}
              {showimg() && <div className={`${styles.divider}`}></div>}
              {showimg() && (
                <div className={`${styles.cancelimg}`}>
                  <div className={`${styles.header} ${styles.boldmd}`}>
                    Add product images
                  </div>
                  <div className={`${styles.addPhoto} ${styles.boldmd}`}>
                    {/* <SvgWrapper svgSrc="add-photo" /> */}
                    <label className={`${styles.addImg}`} htmlFor="my-file">
                      Upload Images / Videos
                      <input
                        type="file"
                        accept="video/*, image/*"
                        multiple="multiple"
                        onChange={handleFileUpload}
                        className={`${styles.formControlFile}`}
                        id="my-file"
                      />
                    </label>

                    <ul className={styles.fileList}>
                      {imageList.map((file) => (
                        <li key={file.id} className={styles.fileItem}>
                          {file.type.includes("image") ? (
                            <img
                              className={styles.uploadedImage}
                              src={file.preview}
                              alt={file.name}
                            />
                          ) : (
                            <video
                              className={styles.uploadedImage}
                              src={file.preview}
                            />
                          )}
                          <span
                            className={styles.cancel}
                            onClick={() => handleRemoveFile(file.id)}
                          >
                            <CrossContainedIcon />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`${styles.makesure}`}>
                    Make sure the product tag is visible in the picture.
                  </div>
                  <div className={`${styles.accept}`}>
                    Accepted image formats jpg & png , File size should be less
                    than 5mb
                  </div>
                  <div className={`${styles.accept}`}>
                    Accepted Video formats MP4, MOV , File size should be less
                    than 25mb
                  </div>
                  {previewList.length > 0 && (
                    <div className={`${styles.previewImg}`}>
                      {previewList?.map((item, index) => (
                        <div key={index}>
                          <span></span>
                          {item.includes("data:video") && (
                            <video
                              width="120px"
                              height="120px"
                              muted
                              autoPlay
                              loop
                            >
                              <source src="item" type="video/quicktime" />
                              <source src="item" type="video/mp4" />
                            </video>
                          )}
                          <div onClick="removeImg(index)">
                            {/* <SvgWrapper
                              svgSrc="close-photo"
                              className={`${styles.svg}`}
                            /> */}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* <div className={`${styles.divider}`}></div> */}
              <div className={`${styles.textarea}`}>
                <div>
                  Comments <span>(Optional)</span>
                </div>
                <textarea
                  placeholder="Enter reason"
                  value={extraComment}
                  onChange={(e) =>
                    setExtraComment(e.target.value.slice(0, 1000))
                  }
                ></textarea>
              </div>

              <div className={`${styles.updateBtns}`}>
                <button
                  type="button"
                  className={`${styles.commonBtn} ${styles.btn} ${styles.cancelBtn}`}
                  onClick={onDontUpdate}
                >
                  Don&apos;t {updateType("cancelBtn")}
                </button>
                <button
                  type="button"
                  className={`${styles.commonBtn} ${styles.btn}`}
                  disabled={buttondisable}
                  onClick={() => onUpdate()}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </ProfileRoot>
  );
}

export default ProfileShipmentUpdatePage;
