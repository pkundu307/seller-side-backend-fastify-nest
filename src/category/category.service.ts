import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type CategoryPathSearchResult = {
  ids: string[];
  names: string[];
  fullPath: string;
};

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // Fetch all parent categories (where parentId is null)
  async getTopLevelCategories() {
    return this.prisma.category.findMany({
      where: {
        parentId: null,
      },
      orderBy: {
        name: 'asc', // optional: sort alphabetically
      },
    });
  }

   async getChildrenByParentId(parentId: string) {
    return this.prisma.category.findMany({
      where: {
        parentId: Number(parentId),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

 async searchCategories(query: string): Promise<CategoryPathSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const results = await this.prisma.$queryRaw<
      { path_ids: number[]; path_names: string[] }[]
    >`
      WITH RECURSIVE CategoryPath AS (
        -- Anchor member: Start with categories matching the search query
        SELECT
          id,
          name,
          "parentId",
          ARRAY[id] AS path_ids,
          --  <<<<<<<<<<<<<<<<<< THE FIX IS HERE >>>>>>>>>>>>>>>>>>
          ARRAY[name]::TEXT[] AS path_names
        FROM
          category
        WHERE
          name ILIKE ${'%' + query + '%'}

        UNION ALL

        -- Recursive member: Join with parent category
        SELECT
          c.id,
          c.name,
          c."parentId",
          c.id || cp.path_ids,
          c.name || cp.path_names
        FROM
          category c
        JOIN
          CategoryPath cp ON c.id = cp."parentId"
      )
      -- Select the final paths when we've reached the root (parentId is NULL)
      SELECT
        path_ids,
        path_names
      FROM
        CategoryPath
      WHERE
        "parentId" IS NULL;
    `;

    // Format the raw SQL result into a more friendly structure for the frontend
    return results.map((p) => ({
      ids: p.path_ids.reverse().map(String),
      names: p.path_names.reverse(),
      fullPath: p.path_names.reverse().join(' > '),
    }));
  }
}
