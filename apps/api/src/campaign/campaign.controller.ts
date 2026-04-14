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
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { CampaignStatus } from '@prisma/client';

class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsString()
  @IsOptional()
  targetRole?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMax?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  targetEndDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  weeklyGoal?: number;
}

class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsString()
  @IsOptional()
  targetRole?: string;

  @IsNumber()
  @IsOptional()
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  salaryMax?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  targetEndDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  weeklyGoal?: number;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;
}

class CreateColumnDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}

class UpdateColumnDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsNumber()
  @IsOptional()
  wipLimit?: number | null;

  @IsString()
  @IsOptional()
  columnType?: string;
}

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.campaignService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.campaignService.findOne(id, req.user.sub);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @Req() req: any) {
    return this.campaignService.create(req.user.sub, {
      ...dto,
      targetEndDate: dto.targetEndDate
        ? new Date(dto.targetEndDate)
        : undefined,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @Req() req: any,
  ) {
    return this.campaignService.update(id, req.user.sub, {
      ...dto,
      targetEndDate: dto.targetEndDate
        ? new Date(dto.targetEndDate)
        : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.campaignService.remove(id, req.user.sub);
  }

  // Column endpoints
  @Post(':id/columns')
  addColumn(
    @Param('id') campaignId: string,
    @Body() dto: CreateColumnDto,
    @Req() req: any,
  ) {
    return this.campaignService.addColumn(campaignId, req.user.sub, dto);
  }

  @Patch(':id/columns/reorder')
  reorderColumns(
    @Param('id') campaignId: string,
    @Body() body: { columnIds: string[] },
    @Req() req: any,
  ) {
    return this.campaignService.reorderColumns(campaignId, req.user.sub, body.columnIds);
  }

  @Patch('columns/:columnId')
  updateColumn(
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
    @Req() req: any,
  ) {
    return this.campaignService.updateColumn(columnId, req.user.sub, dto);
  }

  @Delete('columns/:columnId')
  removeColumn(@Param('columnId') columnId: string, @Req() req: any) {
    return this.campaignService.removeColumn(columnId, req.user.sub);
  }
}
