const New = require("../../model/news.model");
const filterStatusHelpers = require("../../helpers/filterStatus.js");
const searchHelper = require("../../helpers/search");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");

//[GET] /admin/news
module.exports.news = async (req, res) => {
  const filterStatus = filterStatusHelpers(req.query);

  let find = { deleted: false };

  if (req.query.status) {
    find.status = req.query.status;
  }

  const objectSearch = searchHelper(req.query);

  if (objectSearch.regex) {
    find.title = objectSearch.regex;
  }

  // Pagination
  const countNews = await New.countDocuments(find);

  const objectPagination = paginationHelper(
    {
      currentPage: 1,
      limitItems: 4,
    },
    req.query,
    countNews
  );
  // End Pagination

  const news = await New.find(find)
    .sort({ position: "desc" })
    .limit(objectPagination.limitItems)
    .skip(objectPagination.skip);

  res.render("admin/pages/news/index.pug", {
    pageTitle: "Trang danh sách tin tức",
    news: news,
    filterStatus: filterStatus,
    keyword: objectSearch.keyword,
    pagination: objectPagination,
  });
};

//[PATCH] /admin/news/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
  const { status, id } = req.params;

  await New.updateOne({ _id: id }, { status });

  req.flash("success", "Cập nhật trạng thái thành công!");

  res.redirect("back");
};

//[PATCH] /admin/news/change-multi
module.exports.changeMulti = async (req, res) => {
  const { type, ids } = req.body;
  const idArray = ids.split(", ");

  switch (type) {
    case "active":
      await New.updateMany({ _id: { $in: idArray } }, { status: "active" });
      req.flash("success", `Cập nhật trạng thái thành công ${idArray.length} tin tức!`);
      break;

    case "inactive":
      await New.updateMany({ _id: { $in: idArray } }, { status: "inactive" });
      req.flash("success", `Cập nhật trạng thái thành công ${idArray.length} tin tức!`);
      break;

    case "delete-all":
      await New.updateMany({ _id: { $in: idArray } }, { deleted: true, deletedAt: new Date() });
      req.flash("success", `Đã xoá thành công ${idArray.length} tin tức!`);
      break;

    case "change-position":
      for (const item of idArray) {
        const [id, position] = item.split("-");
        await New.updateOne({ _id: id }, { position: parseInt(position) });
      }
      req.flash("success", `Đổi vị trí thành công ${idArray.length} tin tức!`);
      break;

    default:
      req.flash("error", "Thao tác không hợp lệ!");
      break;
  }

  res.redirect("back");
};

//[DELETE] /admin/news/delete/:id
module.exports.deleteItem = async (req, res) => {
  const { id } = req.params;

  await New.updateOne({ _id: id }, { deleted: true, deletedAt: new Date() });
  req.flash("success", "Đã xoá thành công tin tức!");

  res.redirect("back");
};

//[GET] /admin/news/create
module.exports.create = async (req, res) => {
  res.render("admin/pages/news/create.pug", {
    pageTitle: "Thêm mới tin tức",
  });
};

//[POST] /admin/news/create
module.exports.createPost = async (req, res) => {
  console.log(req.file);

  if (req.body.position === "") {
    const countNews = await New.countDocuments();
    req.body.position = countNews + 1;
  } else {
    req.body.position = parseInt(req.body.position);
  }

  req.body.thumbnail = `/uploads/${req.file.filename}`;

  const news = new New(req.body);
  await news.save();

  res.redirect(`${systemConfig.prefixAdmin}/news`);
};
