import { PartialType } from '@nestjs/swagger';
import { CreateHomepageSectionDto } from './create-homepage-section.dto';

// All fields from Create dto are now optional
export class UpdateHomepageSectionDto extends PartialType(CreateHomepageSectionDto) {}