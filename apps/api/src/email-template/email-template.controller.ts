import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  subject!: string;

  @IsString()
  body!: string;

  @IsString()
  category!: string;
}

class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

class RenderTemplateDto {
  @IsString()
  templateId!: string;

  variables!: Record<string, string>;
}

@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.templateService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.templateService.findOne(id, req.user.sub);
  }

  @Post()
  async create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    return this.templateService.create({
      userId: req.user.sub,
      ...dto,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: any,
  ) {
    return this.templateService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.templateService.delete(id, req.user.sub);
  }

  @Post('render')
  async render(@Body() dto: RenderTemplateDto, @Req() req: any) {
    const template = await this.templateService.findOne(dto.templateId, req.user.sub);
    return this.templateService.renderTemplate(template, dto.variables);
  }

  @Post('seed-defaults')
  async seedDefaults(@Req() req: any) {
    await this.templateService.seedDefaults(req.user.sub);
    return { success: true };
  }
}
