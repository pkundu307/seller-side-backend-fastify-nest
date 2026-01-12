"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSeoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_seo_dto_1 = require("./create-seo.dto");
class UpdateSeoDto extends (0, swagger_1.PartialType)(create_seo_dto_1.CreateSeoDto) {
}
exports.UpdateSeoDto = UpdateSeoDto;
//# sourceMappingURL=update-seo.dto.js.map