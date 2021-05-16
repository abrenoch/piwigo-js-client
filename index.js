import FormData from 'form-data';
import fetch from 'node-fetch';

const API_METHODS = {
    PWG_GETVERSION : 'pwg.getVersion',
    PWG_API_REFLECT : 'reflection.getMethodList',
    PWG_SESSION_LOGIN : 'pwg.session.login',
    PWG_SESSION_LOGOUT : 'pwg.session.logout',
    PWG_SESSION_STATUS : 'pwg.session.getStatus',
    PWG_TAGS_LIST : 'pwg.tags.getList',
    PWG_TAGS_GETIMAGES : 'pwg.tags.getImages',
    PWG_TAGS_ADD : 'pwg.tags.add',
    PWG_CATEGORIES_LIST : 'pwg.categories.getList',
    PWG_CATEGORIES_GETIMAGES : 'pwg.categories.getImages',
    PWG_CATEGORIES_ADDTO : 'pwg.categories.add',
    PWG_CATEGORIES_DELETE : 'pwg.categories.delete',
    PWG_CATEGORIES_MOVE : 'pwg.categories.move',
    PWG_CATEGORIES_SETTHUMB : 'pwg.categories.setRepresentative',
    PWG_CATEGORIES_REMOVETHUMB : 'pwg.categories.deleteRepresentative',
    PWG_CATEGORIES_REFRESHTHUMB : 'pwg.categories.refreshRepresentative',
    PWG_CATEGORIES_SETINFO : 'pwg.categories.setInfo',
    PWG_CATEGORIES_SETRANK : 'pwg.categories.setRank',
    PWG_IMAGE_GETINFO : 'pwg.images.getInfo',
    PWG_IMAGE_SETINFO : 'pwg.images.setInfo',
    PWG_IMAGE_SETRANK : 'pwg.images.setRank',
    PWG_IMAGE_SEARCH : 'pwg.images.search',
    PWG_IMAGE_RATE : 'pwg.images.rate',
    PWG_IMAGE_DELETE : 'pwg.images.delete',
    PWG_IMAGE_ADDCOMMENT : 'pwg.images.addComment',
    PWG_IMAGE_EXIST : 'pwg.images.exist',
    PWG_EXTENSIONS_CHECKUPDATES : 'pwg.extensions.checkUpdates',
    PWG_EXTENSIONS_UPDATE : 'pwg.extensions.update',
    PWG_EXTENSIONS_IGNOREUPDATE : 'pwg.extensions.ignoreUpdate',
    PWG_RATING_REMOVE : 'pwg.rates.delete',
    PWG_USERS_SETINFO : 'pwg.users.setInfo',
    PWG_USERS_ADDFAVORITE : 'pwg.users.favorites.add',
    PWG_USERS_REMOVEFAVORITE : 'pwg.users.favorites.remove',
    PWG_USERS_GETFAVORITES : 'pwg.users.favorites.getList'
};

const PWG_THUMBNAIL_SQUARE = 'square';
const PWG_THUMBNAIL_THUMB = 'thumb';
const PWG_THUMBNAIL_2SMALL = '2small';
const PWG_THUMBNAIL_XSMALL = 'xsmall';
const PWG_THUMBNAIL_SMALL = 'small';
const PWG_THUMBNAIL_MEDIUM = 'medium';
const PWG_THUMBNAIL_LARGE = 'large';
const PWG_THUMBNAIL_XLARGE = 'xlarge';
const PWG_THUMBNAIL_XXLARGE = 'xxlarge';

const PWG_ORDERS = {
    ID: 'id',
    FILE: 'file',
    NAME: 'name',
    HIT: 'hit',
    RATING: 'rating_score',
    CREATED: 'date_created',
    AVAILABLE: 'date_available',
    RANDOM: 'random'
};

const FIELD_EDIT_MODE_SINGLE_FILL_IF_EMPTY = 'fill_if_empty';
const FIELD_EDIT_MODE_SINGLE_REPLACE = 'replace';
const FIELD_EDIT_MODE_MULTI_APPEND = 'append';
const FIELD_EDIT_MODE_MULTI_REPLACE = 'replace';

const DEFAULT_PAGE_SIZE = 50;
const API_PATH = '/ws.php?format=json';
const DEFAULT_SORT = [
    { field: PWG_ORDERS.AVAILABLE, direction: 'DESC' }
];

function buildFormData(formData, data, parentKey) {
    if (data && typeof data === 'object' && !(data instanceof Date)) {
        Object.keys(data).forEach(key => {
            buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
        });
    } else {
        const value = data == null ? '' : data;
        formData.append(parentKey, value);
    }
};

function parseSortObject (sorting = []) {
    if (sorting === null) return undefined;
    const orders = Object.keys(PWG_ORDERS).map(k => PWG_ORDERS[k]);
    if (sorting.some(item => item.field === PWG_ORDERS.RANDOM)) {
        return PWG_ORDERS.RANDOM;
    }
    const output = sorting.filter(item => orders.includes(item.field)).map(item => {
        if (item.hasOwnProperty('direction') && item.direction) {
            switch (item.direction.toUpperCase()) {
                case 'ASC':
                    return `${item.field} ASC`
                case 'DESC':
                    return `${item.field} DESC`
            }            
        }
        return item.field;
    });
    return output.length ? output.join(', ') : undefined;
}

async function Request (address, method, params = {}) {
    const formData = new FormData();
    buildFormData(formData, {method: method, ...params});
    try {
        const response = await fetch(address + API_PATH, {
            credentials: 'same-origin',
            body: formData,
            method: 'POST'
        });
        const responseJSON = await response.json();
        return [responseJSON.result, responseJSON.stat];
    }
    catch (err) {
        console.error(err);
        return err;
    }
};

export default class PiwigoClient {

    constructor (host) {
        this.setHost(host);
    }

    setHost (host) {
        this.host = host;
    }

    async login (username, password) {
        const payload = {
            username,
            password
        };
        return Request(this.host, API_METHODS.PWG_SESSION_LOGIN, payload);
    }

    async logout () {
        return Request(this.host, API_METHODS.PWG_SESSION_LOGOUT);
    }

    async getSessionStatus () {
        const [results, status] = await Request(this.host, API_METHODS.PWG_SESSION_STATUS);
        return [results, status];
    }

    async getAvailableMethods () {
        const [results, status] = await Request(this.host, API_METHODS.PWG_API_REFLECT);
        return [results.methods, status];
    }

    async getTags (sortByCount = false) {
        const payload = {
            sort_by_counter: sortByCount
        };
        const [results, status] = await Request(this.host, API_METHODS.PWG_TAGS_LIST, payload);
        return [results.tags, status];
    }

    async getTagImages (tagIDs = [], page = 0, order = DEFAULT_SORT, pageSize = DEFAULT_PAGE_SIZE, matchAllTags = false, filter = null, untaggedOnly = false) {
        const payload = {
            tag_id: (typeof tagIDs === 'string' || typeof tagIDs === 'number') ? [tagIDs] : tagIDs,
            tag_mode_and: matchAllTags,
            per_page: pageSize,
            page,
            order: parseSortObject(order),

            // experimental - not officially supported
            untagged_only: untaggedOnly
        };
        const [results, status] = await Request(this.host, API_METHODS.PWG_TAGS_GETIMAGES, payload);
        return [results.images, results.paging, status];
    }

    async getCategories (parentCategory = null, recursive = false, treeOutput = false, thumbnailSize = PWG_THUMBNAIL_THUMB) {
        const payload = {
            recursive,
            tree_output: treeOutput,
            thumbnail_size: thumbnailSize
        };
        if (parentCategory !== null) payload.cat_id = parentCategory;
        const [categories, status] = await Request(this.host, API_METHODS.PWG_CATEGORIES_LIST, payload);
        return [categories, status];
    }

    async getCategoryImages (category = null, page = 0, order = DEFAULT_SORT, pageSize = DEFAULT_PAGE_SIZE, recursive = false, filter = null) {
        const payload = {
            recursive,
            per_page: pageSize,
            page: page,
            order: parseSortObject(order)
        };
        if (category !== null) payload.cat_id = category;
        const [results, status] = await Request(this.host, API_METHODS.PWG_CATEGORIES_GETIMAGES, payload);
        return [results.images, results.paging, status];
    }

    async getFavoriteImages (page = 0, order = DEFAULT_SORT, pageSize = DEFAULT_PAGE_SIZE) {
        const payload = {
            per_page: pageSize,
            page: page,
            order: parseSortObject(order)
        };
        const [results, status] = await Request(this.host, API_METHODS.PWG_USERS_GETFAVORITES, payload);
        return [results.images, results.paging, status];
    }

    async addToFavorites (imageID = null) {
        const payload = {
            image_id: imageID,
        };
        return await Request(this.host, API_METHODS.PWG_USERS_ADDFAVORITE, payload);
    }

    async removeFromFavorites (imageID = null) {
        const payload = {
            image_id: imageID,
        };
        return await Request(this.host, API_METHODS.PWG_USERS_REMOVEFAVORITE, payload);
    }

    async setImageInfo (imageID = null, fields = {}, singleValueMode = FIELD_EDIT_MODE_SINGLE_FILL_IF_EMPTY, multiValueMode = FIELD_EDIT_MODE_MULTI_APPEND) {
        const payload = {
            image_id: imageID,
            ...fields,
            single_value_mode: singleValueMode,
            multiple_value_mode: multiValueMode
        };
        return [results, status] = await Request(this.host, API_METHODS.PWG_IMAGE_SETINFO, payload);
    }

    async setImageRating (imageID = null, rate = 0) {
        const payload = {
            image_id: imageID,
            rate
        };
        return [results, status] = await Request(this.host, API_METHODS.PWG_IMAGE_RATE, payload);
    }

    async getImageInfo (imageID = null) {
        const payload = {
            image_id: imageID
        };
        return [results, status] = await Request(this.host, API_METHODS.PWG_IMAGE_GETINFO, payload);
    }
};

PiwigoClient.API_METHODS = API_METHODS;

export {
    PiwigoClient,
    API_METHODS,
    DEFAULT_SORT,
    DEFAULT_PAGE_SIZE,
    PWG_THUMBNAIL_SQUARE,
    PWG_THUMBNAIL_THUMB,
    PWG_THUMBNAIL_2SMALL,
    PWG_THUMBNAIL_XSMALL,
    PWG_THUMBNAIL_SMALL,
    PWG_THUMBNAIL_MEDIUM,
    PWG_THUMBNAIL_LARGE,
    PWG_THUMBNAIL_XLARGE,
    PWG_THUMBNAIL_XXLARGE,
    PWG_ORDERS,
    FIELD_EDIT_MODE_SINGLE_FILL_IF_EMPTY,
    FIELD_EDIT_MODE_SINGLE_REPLACE,
    FIELD_EDIT_MODE_MULTI_APPEND,
    FIELD_EDIT_MODE_MULTI_REPLACE,
}
