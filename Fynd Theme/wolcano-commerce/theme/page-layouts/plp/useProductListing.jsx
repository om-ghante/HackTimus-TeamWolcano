import React, { useEffect, useState, useMemo } from "react";
import { useGlobalStore } from "fdk-core/utils";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import useSortModal from "./useSortModal";
import useFilterModal from "./useFilterModal";
import { PLP_PRODUCTS } from "../../queries/plpQuery";
import {
  getProductImgAspectRatio,
  isRunningOnClient,
} from "../../helper/utils";
import productPlaceholder from "../../assets/images/placeholder3x4.png";
import useAddToCartModal from "./useAddToCartModal";
import { useAccounts, useWishlist, useThemeConfig } from "../../helper/hooks";
import useInternational from "../../components/header/useInternational";

const INFINITE_PAGE_SIZE = 12;
const PAGES_TO_SHOW = 5;
const PAGE_OFFSET = 2;

const useProductListing = ({ fpi, props }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isInternational, i18nDetails, defaultCurrency } = useInternational({
    fpi,
  });

  const { globalConfig, listingPrice } = useThemeConfig({
    fpi,
    page: "product-listing",
  });
  const {
    desktop_banner = "",
    mobile_banner = "",
    banner_link = "",
    product_number = true,
    loading_options = "pagination",
    page_size = 12,
    back_top = true,
    in_new_tab = true,
    hide_brand = false,
    grid_desktop = 4,
    grid_tablet = 3,
    grid_mob = 1,
    description = "",
    show_add_to_cart = true,
    mandatory_pincode = true,
    hide_single_size = false,
    preselect_size = true,
    img_resize = 300,
    img_resize_mobile = 500,
  } = Object.entries(props).reduce((acc, [key, { value }]) => {
    acc[key] = value;
    return acc;
  }, {});

  const pageSize =
    loading_options === "infinite" ? INFINITE_PAGE_SIZE : page_size;

  const addToCartConfigs = {
    mandatory_pincode,
    hide_single_size,
    preselect_size,
  };

  const {
    headerHeight = 0,
    isPlpSsrFetched,
    customProductList: productsListData,
  } = useGlobalStore(fpi?.getters?.CUSTOM_VALUE);
  const locationDetails = useGlobalStore(fpi?.getters?.LOCATION_DETAILS);
  const pincodeDetails = useGlobalStore(fpi?.getters?.PINCODE_DETAILS);

  const { filters = [], sort_on: sortOn, page, items } = productsListData || {};

  const [productList, setProductList] = useState(items || undefined);
  const currentPage = productsListData?.page?.current ?? 1;
  const [apiLoading, setApiLoading] = useState(!isPlpSsrFetched);
  const [isPageLoading, setIsPageLoading] = useState(!isPlpSsrFetched);
  const {
    user_plp_columns = {
      desktop: Number(grid_desktop),
      tablet: Number(grid_tablet),
      mobile: Number(grid_mob),
    },
  } = useGlobalStore(fpi?.getters?.CUSTOM_VALUE) ?? {};
  const [isResetFilterDisable, setIsResetFilterDisable] = useState(true);

  const isAlgoliaEnabled = globalConfig?.algolia_enabled;

  const breadcrumb = useMemo(
    () => [{ label: "Home", link: "/" }, { label: "Products" }],
    []
  );

  const isClient = useMemo(() => isRunningOnClient(), []);

  const addToCartModalProps = useAddToCartModal({
    fpi,
    pageConfig: addToCartConfigs,
  });

  const pincode = useMemo(() => {
    if (!isClient) {
      return "";
    }
    return (
      pincodeDetails?.localityValue ||
      locationDetails?.pincode ||
      locationDetails?.sector ||
      ""
    );
  }, [pincodeDetails, locationDetails]);

  useEffect(() => {
    fpi.custom.setValue("isPlpSsrFetched", false);
  }, []);

  useEffect(() => {
    if (!isPlpSsrFetched || locationDetails) {
      const searchParams = isClient
        ? new URLSearchParams(location?.search)
        : null;
      const pageNo = Number(searchParams?.get("page_no"));
      const payload = {
        pageType: "number",
        first: pageSize,
        filterQuery: appendDelimiter(searchParams?.toString()) || undefined,
        sortOn: searchParams?.get("sort_on") || undefined,
        search: searchParams?.get("q") || undefined,
      };

      if (loading_options === "pagination") payload.pageNo = pageNo || 1;

      fetchProducts(payload);

      const resetableFilterKeys =
        Array.from(searchParams?.keys?.() ?? [])?.filter?.(
          (i) => !["q", "sort_on", "page_no"].includes(i)
        ) ?? [];
      setIsResetFilterDisable(!resetableFilterKeys?.length);
    }
  }, [location?.search, pincode, locationDetails]);

  const convertQueryParamsForAlgolia = () => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(location?.search);
    const filterParams = [];

    const skipKeys = new Set(["sort_on", "siteTheme", "page_no", "q"]);

    params.forEach((value, key) => {
      if (skipKeys.has(key)) return;

      const decodedValue = decodeURIComponent(value);

      // Check if the key already exists in the filterParams
      const existingParam = filterParams.find((param) =>
        param.startsWith(`${key}:`)
      );

      if (existingParam) {
        // If the key already exists, append the new value using "||"
        const updatedParam = `${existingParam}||${decodedValue}`;
        filterParams[filterParams.indexOf(existingParam)] = updatedParam;
      } else {
        // Otherwise, add the key-value pair
        filterParams.push(`${key}:${decodedValue}`);
      }
    });

    // Join all the filters with ":::"
    return filterParams.join(":::");
  };

  const fetchProducts = (payload, append = false) => {
    setApiLoading(true);

    if (isAlgoliaEnabled) {
      const BASE_URL = `${window.location.origin}/ext/algolia/application/api/v1.0/products`;

      const url = new URL(BASE_URL);
      url.searchParams.append(
        "page_id",
        payload?.pageNo === 1 || !payload?.pageNo ? "*" : payload?.pageNo - 1
      );
      url.searchParams.append("page_size", payload?.first);

      const filterQuery = convertQueryParamsForAlgolia();

      if (payload?.sortOn) {
        url.searchParams.append("sort_on", payload?.sortOn);
      }
      if (filterQuery) {
        url.searchParams.append("f", filterQuery);
      }
      if (payload?.search) {
        url.searchParams.append("q", payload?.search);
      }

      fetch(url, {
        headers: {
          "x-location-detail": JSON.stringify({
            country_iso_code: i18nDetails?.countryCode || "IN",
          }),
          "x-currency-code":
            i18nDetails?.currency?.code || defaultCurrency?.code,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          const productDataNormalization = data.items?.map((item) => ({
            ...item,
            media: item.medias,
          }));

          data.page.current = payload?.pageNo;

          const productList = {
            filters: data?.filters,
            items: productDataNormalization,
            page: data?.page,
            sort_on: data?.sort_on,
          };
          setApiLoading(false);
          fpi.custom.setValue("customProductList", productList);
          if (append) {
            setProductList((prevState) => {
              return prevState.concat(productList?.items || []);
            });
          } else {
            setProductList(productList?.items || []);
          }
        })
        .finally(() => {
          setApiLoading(false);
          setIsPageLoading(false);
        });
    } else {
      fpi
        .executeGQL(PLP_PRODUCTS, payload, { skipStoreUpdate: false })
        .then((res) => {
          if (append) {
            setProductList((prevState) => {
              return prevState.concat(res?.data?.products?.items || []);
            });
          } else {
            setProductList(res?.data?.products?.items || []);
          }
          fpi.custom.setValue("customProductList", res?.data?.products);
          setApiLoading(false);
        })
        .finally(() => {
          setApiLoading(false);
          setIsPageLoading(false);
        });
    }
  };

  const handleLoadMoreProducts = () => {
    const searchParams = isClient
      ? new URLSearchParams(location?.search)
      : null;
    const payload = {
      pageNo: currentPage + 1,
      pageType: "number",
      first: pageSize,
      filterQuery: appendDelimiter(searchParams?.toString()) || undefined,
      sortOn: searchParams?.get("sort_on") || undefined,
      search: searchParams?.get("q") || undefined,
    };
    fetchProducts(payload, true);
  };

  function appendDelimiter(queryString) {
    const searchParams = isClient ? new URLSearchParams(queryString) : null;
    const params = Array.from(searchParams?.entries() || []);

    const result = params.reduce((acc, [key, value]) => {
      if (key !== "page_no" && key !== "sort_on" && key !== "q") {
        acc.push(`${key}:${value}`);
      }
      return acc;
    }, []);
    // Append ::: to each parameter except the last one
    return result.join(":::");
  }

  const handleFilterUpdate = ({ filter, item }) => {
    const searchParams = isClient
      ? new URLSearchParams(location?.search)
      : null;
    const {
      key: { name, kind },
    } = filter;
    const { value, is_selected } = item;

    if (kind === "range") {
      if (value) searchParams?.set(name, value);
      else searchParams?.delete(name);
    } else if (!searchParams?.has(name, value) && !is_selected) {
      searchParams?.append(name, value);
    } else {
      searchParams?.delete(name, value);
    }
    searchParams?.delete("page_no");
    navigate?.({
      pathname: location?.pathname,
      search: searchParams?.toString(),
    });
  };

  const handleSortUpdate = (value) => {
    const searchParams = isClient
      ? new URLSearchParams(location?.search)
      : null;
    if (value) {
      searchParams?.set("sort_on", value);
    } else {
      searchParams?.delete("sort_on");
    }
    searchParams?.delete("page_no");
    navigate?.({
      pathname: location?.pathname,
      search: searchParams?.toString(),
    });
  };

  function resetFilters() {
    const searchParams = isClient
      ? new URLSearchParams(location?.search)
      : null;
    filters?.forEach((filter) => {
      searchParams?.delete(filter.key.name);
    });
    searchParams?.delete("page_no");
    navigate?.({
      pathname: location?.pathname,
      search: searchParams?.toString(),
    });
  }

  const getPageUrl = (pageNo) => {
    const searchParams = isClient
      ? new URLSearchParams(location?.search)
      : null;
    searchParams?.set("page_no", pageNo);
    return `${location?.pathname}?${searchParams?.toString()}`;
  };

  const getStartPage = ({ current, totalPageCount }) => {
    const index = Math.max(current - PAGE_OFFSET, 1);
    const lastIndex = Math.max(totalPageCount - PAGES_TO_SHOW + 1, 1);

    if (index <= 1) {
      return 1;
    }
    if (index > lastIndex) {
      return lastIndex;
    }
    return index;
  };

  const paginationProps = useMemo(() => {
    if (!productsListData?.page) {
      return;
    }
    const {
      current,
      has_next: hasNext,
      has_previous: hasPrevious,
      item_total,
    } = productsListData?.page || {};
    const totalPageCount = Math.ceil(item_total / pageSize);
    const startingPage = getStartPage({ current, totalPageCount });

    const displayPageCount = Math.min(totalPageCount, PAGES_TO_SHOW);

    const pages = [];
    for (let i = 0; i < displayPageCount; i++) {
      pages.push({
        link: getPageUrl(startingPage + i),
        index: startingPage + i,
      });
    }

    return {
      current: current || 1,
      hasNext,
      hasPrevious,
      prevPageLink: hasPrevious ? getPageUrl(current - 1) : "",
      nextPageLink: hasNext ? getPageUrl(current + 1) : "",
      pages,
    };
  }, [productsListData?.page]);

  const handleColumnCountUpdate = ({ screen, count }) => {
    fpi.custom.setValue("user_plp_columns", {
      ...user_plp_columns,
      [screen]: count,
    });
  };

  const { openSortModal, ...sortModalProps } = useSortModal({
    sortOn,
    handleSortUpdate,
  });

  const filterList = useMemo(() => {
    const searchParams = isClient
      ? new URLSearchParams(location?.search)
      : null;
    return (filters ?? []).map((filter) => {
      const isNameInQuery =
        searchParams?.has(filter?.key?.name) ||
        filter?.values?.some(({ is_selected }) => is_selected);
      return { ...filter, isOpen: isNameInQuery };
    });
  }, [filters, location?.search]);

  const isFilterOpen = filterList.some((filter) => filter.isOpen);

  if (!isFilterOpen && filterList.length > 0) {
    filterList[0].isOpen = true;
  }

  const selectedFilters = useMemo(() => {
    const searchParams = isRunningOnClient()
      ? new URLSearchParams(location?.search)
      : null;

    return filterList?.reduce((acc, curr) => {
      const selectedValues = curr?.values?.filter(
        (filter) =>
          searchParams?.getAll(curr?.key?.name).includes(filter?.value) ||
          filter?.is_selected
      );

      if (selectedValues.length > 0) {
        return [...acc, { key: curr?.key, values: selectedValues }];
      }

      return acc;
    }, []);
  }, [filterList]);

  const { openFilterModal, ...filterModalProps } = useFilterModal({
    filters: filterList ?? [],
    resetFilters,
    handleFilterUpdate,
  });
  const { toggleWishlist, followedIdList } = useWishlist({ fpi });
  const { isLoggedIn, openLogin } = useAccounts({ fpi });

  const handleWishlistToggle = (data) => {
    if (!isLoggedIn) {
      openLogin();
      return;
    }
    toggleWishlist(data);
  };

  const imgSrcSet = useMemo(() => {
    if (globalConfig?.img_hd) {
      return [];
    }
    return [
      { breakpoint: { min: 481 }, width: img_resize },
      { breakpoint: { max: 480 }, width: img_resize_mobile },
    ];
  }, [globalConfig?.img_hd, img_resize, img_resize_mobile]);

  return {
    breadcrumb,
    isProductCountDisplayed: product_number,
    productCount: page?.item_total,
    isScrollTop: back_top,
    title: searchParams.get("q")
      ? `Results for "${searchParams.get("q")}"`
      : "",
    description: description,
    filterList,
    selectedFilters,
    sortList: sortOn,
    productList: productList || items || [],
    columnCount: user_plp_columns,
    isProductOpenInNewTab: in_new_tab,
    isBrand: !hide_brand,
    isSaleBadge: globalConfig?.show_sale_badge,
    isPrice: globalConfig?.show_price,
    globalConfig,
    imgSrcSet,
    isResetFilterDisable,
    aspectRatio: getProductImgAspectRatio(globalConfig),
    isWishlistIcon: true,
    followedIdList,
    isProductLoading: apiLoading,
    banner: {
      desktopBanner: desktop_banner,
      mobileBanner: mobile_banner,
      redirectLink: banner_link,
    },
    isPageLoading,
    listingPrice,
    loadingOption: loading_options,
    paginationProps,
    sortModalProps,
    filterModalProps,
    addToCartModalProps,
    isImageFill: globalConfig?.img_fill,
    imageBackgroundColor: globalConfig?.img_container_bg,
    showImageOnHover: globalConfig?.show_image_on_hover,
    imagePlaceholder: productPlaceholder,
    showAddToCart:
      !isInternational && show_add_to_cart && !globalConfig?.disable_cart,
    stickyFilterTopOffset: headerHeight + 30,
    onResetFiltersClick: resetFilters,
    onColumnCountUpdate: handleColumnCountUpdate,
    onFilterUpdate: handleFilterUpdate,
    onSortUpdate: handleSortUpdate,
    onFilterModalBtnClick: openFilterModal,
    onSortModalBtnClick: openSortModal,
    onWishlistClick: handleWishlistToggle,
    onViewMoreClick: handleLoadMoreProducts,
    onLoadMoreProducts: handleLoadMoreProducts,
  };
};

export default useProductListing;
