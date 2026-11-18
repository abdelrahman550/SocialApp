import mongoose, {
  AnyKeys,
  CreateOptions,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  Model,
  MongooseUpdateQueryOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  QueryWithHelpers,
  UpdateQuery,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
} from "mongoose";
import { IPagination } from "../interface";

export abstract class DatabaseRepository<TRawDocType> {
  constructor(protected model: Model<TRawDocType>) {}

  // CREATE
  async create({
    data,
  }: {
    data: AnyKeys<TRawDocType>;
  }): Promise<HydratedDocument<TRawDocType>>;

  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDocType>[];
    options?: CreateOptions;
  }): Promise<HydratedDocument<TRawDocType>[]>;

  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDocType> | AnyKeys<TRawDocType>[];
    options?: CreateOptions;
  }): Promise<HydratedDocument<TRawDocType> | HydratedDocument<TRawDocType>[]> {
    return await this.model.create(data as any, options);
  }

  // CREATE ONE
  async createOne({
    data,
    options = {},
  }: {
    data: AnyKeys<TRawDocType>;
    options?: CreateOptions;
  }): Promise<HydratedDocument<TRawDocType>> {
    const [doc] = await this.create({ data: [data], options });
    return doc as HydratedDocument<TRawDocType>;
  }

  // FIND ONE
  async findOne({
    filter,
    projection,
    options,
  }: {
    filter: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?: (QueryOptions<TRawDocType> & { lean: true }) | null | undefined;
  }): Promise<FlattenMaps<TRawDocType> | null>;

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?: (QueryOptions<TRawDocType> & { lean?: false }) | null | undefined;
  }): Promise<HydratedDocument<TRawDocType> | null>;

  async findOne({
    filter = {},
    projection,
    options,
  }: {
    filter: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?:
      | (QueryOptions<TRawDocType> & { lean?: boolean })
      | null
      | undefined;
  }): Promise<HydratedDocument<TRawDocType> | FlattenMaps<TRawDocType> | null> {
    return this.model.findOne(filter, projection, options ?? undefined).exec();
  }

  // FIND BY ID
  async findById({
    id,
    projection,
    options,
  }: {
    id: mongoose.Types.ObjectId;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?: (QueryOptions<TRawDocType> & { lean: true }) | null | undefined;
  }): Promise<FlattenMaps<TRawDocType> | null>;

  async findById({
    id,
    projection,
    options,
  }: {
    id: mongoose.Types.ObjectId;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?: (QueryOptions<TRawDocType> & { lean?: false }) | null | undefined;
  }): Promise<HydratedDocument<TRawDocType> | null>;

  async findById({
    id,
    projection,
    options,
  }: {
    id: mongoose.Types.ObjectId;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?:
      | (QueryOptions<TRawDocType> & { lean?: boolean })
      | null
      | undefined;
  }): Promise<HydratedDocument<TRawDocType> | FlattenMaps<TRawDocType> | null> {
    return this.model.findById(id, projection, options ?? undefined).exec();
  }

  // FIND
  async find({
    filter = {},
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?: QueryOptions<TRawDocType> | null;
  }): Promise<HydratedDocument<TRawDocType>[]> {
    return this.model.find(filter, projection, options ?? undefined).exec();
  }

  // COUNT DOCUMENTS
  async countDocuments({
    filter = {},
  }: {
    filter?: QueryFilter<TRawDocType>;
  }): Promise<number> {
    return await this.model.countDocuments(filter);
  }

  // PAGINATE
  async paginate({
    filter = {},
    projection,
    options = {},
    page = "all",
    size = 5,
  }: {
    filter?: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType> | null | undefined;
    options?: QueryOptions<TRawDocType> | null;
    page?: number | "all";
    size?: number;
  }): Promise<IPagination<HydratedDocument<TRawDocType>>> {
    let docsCount: number | undefined;
    let pages: number | undefined;
    let currentPage: number | undefined;

    const queryOptions: QueryOptions<TRawDocType> = { ...options };

    if (page !== "all") {
      currentPage = Math.floor(page < 1 ? 1 : page);
      queryOptions.limit = Math.floor(!size || size < 1 ? 5 : size);
      queryOptions.skip = (currentPage - 1) * queryOptions.limit;

      docsCount = await this.countDocuments({ filter });
      pages = Math.ceil(docsCount / queryOptions.limit);
    }

    const result = await this.find({
      filter,
      projection,
      options: queryOptions,
    });

    return {
      docsCount,
      limit: queryOptions.limit,
      pages,
      currentPage,
      result,
    };
  }

  // UPDATE ONE
  async updateOne({
    filter = {},
    update,
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    update: UpdateQuery<TRawDocType> | UpdateWithAggregationPipeline;
    options?: MongooseUpdateQueryOptions<TRawDocType> | null;
  }): Promise<UpdateWriteOpResult> {
    return await this.model.updateOne(filter, update, options);
  }

  // UPDATE MANY
  async updateMany({
    filter = {},
    update,
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    update: UpdateQuery<TRawDocType> | UpdateWithAggregationPipeline;
    options?: MongooseUpdateQueryOptions<TRawDocType> | null;
  }): Promise<UpdateWriteOpResult> {
    return await this.model.updateMany(filter, update, options);
  }

  // FIND ONE AND UPDATE
  async findOneAndUpdate({
    filter = {},
    update,
    options = {},
  }: {
    filter?: QueryFilter<TRawDocType>;
    update?: UpdateQuery<TRawDocType>;
    options?: QueryOptions<TRawDocType> | null;
  }): Promise<HydratedDocument<TRawDocType> | null> {
    return await this.model.findOneAndUpdate(filter, update, {
      returnDocument: "after",
      ...options,
    });
  }

  // FIND BY ID AND UPDATE
  async findByIdAndUpdate({
    id,
    update,
    options = {},
  }: {
    id: mongoose.Types.ObjectId;
    update?: UpdateQuery<TRawDocType>;
    options?: QueryOptions<TRawDocType> | null;
  }): Promise<HydratedDocument<TRawDocType> | null> {
    return await this.model.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      ...options,
    });
  }

  // DELETE ONE

  async deleteOne({
    filter = {},
  }: {
    filter: QueryFilter<TRawDocType>;
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter);
  }

  // DELETE MANY
  async deleteMany({
    filter = {},
  }: {
    filter: QueryFilter<TRawDocType>;
  }): Promise<DeleteResult> {
    return await this.model.deleteMany(filter);
  }

  // FIND ONE AND DELETE
  async findOneAndDelete({
    filter = {},
  }: {
    filter?: QueryFilter<TRawDocType>;
  }): Promise<HydratedDocument<TRawDocType> | null> {
    return await this.model.findOneAndDelete(filter);
  }

  // FIND BY ID AND DELETE
  async findByIdAndDelete({
    id,
  }: {
    id: mongoose.Types.ObjectId;
  }): Promise<HydratedDocument<TRawDocType> | null> {
    return await this.model.findByIdAndDelete(id);
  }
}
