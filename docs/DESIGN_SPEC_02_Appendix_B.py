# DO NOT USE THIS FILE, THIS IS ONLY FOR REFERENCE
detailed_type = {
    "tinygoblin": "Goblin",
    "Soft": "Elixir",
    "Core": "Gold",
    "Dynamite": "Dynamite",
}


class GNGSave:
    def __init__(self, decoded_save_data: dict):
        self.world_data = decoded_save_data
        self.last_save_time = unix_to_utc(int(decoded_save_data["LastSave"]))

        self.save_data_evergreen = GNGWorld(decoded_save_data["Evergreen"])
        self.save_data_lte = (
            GNGWorld(decoded_save_data["Lte"]) if decoded_save_data["Lte"] else None
        )

    def is_lte_active(self) -> bool:
        return bool(self.save_data_lte)

    def generate_status(self) -> dict:
        if self.is_lte_active():
            worlds = [self.save_data_lte, self.save_data_evergreen]
        else:
            worlds = [self.save_data_evergreen]

        return_data = {}
        return_data["Status"] = 0
        return_data["LastSaveTime"] = self.last_save_time
        return_data["Worlds"] = []

        for i in worlds:
            world_data = {}
            world_data["BalanceId"] = i.balance_id
            world_data["BalanceName"] = (
                "Main Mine" if i.balance_id == "evergreen" else i.balance_id.title()
            )
            world_data["DeliveryData"] = i.get_delivery_information()
            world_data["GoblinLevels"] = i.current_goblins
            world_data["GoblinLevelsIncrease"] = i.get_time_to_higher_goblins()

            return_data["Worlds"].append(world_data)

        return return_data


class GNGWorld:
    def __init__(self, world_data: dict):
        self.world_data = world_data
        self.last_save_time = unix_to_utc(int(world_data["LastSaveTimestampSeconds"]))
        self.balance_id = world_data["BalanceId"]
        self.balance_data = load_balance_file(world_data["BalanceId"])

        self.current_rank = world_data["Rank"]
        zone = world_data["Zone"]
        self.current_checkpoint = (
            len(zone["ClearedCheckPointLevelVals"])
            if "ClearedCheckPointLevelVals" in zone
            else 0
        )
        self.deliveries = {
            "DeliveryTime": dotnet_ticks_to_utc(int(world_data["DeliveryTime"])),
            "DeliveryClaimCountResetTime": dotnet_ticks_to_utc(
                int(world_data["DeliveryClaimCountResetTime"])
            ),
            "DeliveryDupeReset": dotnet_ticks_to_utc(
                int(world_data["DeliveryDupeReset"])
            ),
            "DeliveryClaimCount": world_data["DeliveryClaimCount"]
            if "DeliveryClaimCount" in world_data
            else 0,
        }

        claimed_delivery_dupe_counts = world_data["ClaimedDeliveryDupeCounts"]
        claimed_delivery_dupe_ids = world_data["ClaimedDeliveryDupeIds"]

        self.claimed_deliveries = {
            str(i): c
            for i, c in zip(claimed_delivery_dupe_ids, claimed_delivery_dupe_counts)
        }

        self.current_goblins = self.get_current_goblins()

    def get_current_goblins(self) -> list:
        goblins = []

        for i in self.world_data["Zone"]["Grid"]:
            if i.get("Key") == "m":
                goblins.append(i["Level"])

        return sorted(goblins, reverse=True)

    def get_time_to_higher_goblins(self) -> list:
        goblin_value = 0
        max_goblin_level = 0
        barrel_time_elapsed = 0

        for i in self.world_data["Zone"]["Grid"]:
            if i.get("Key") == "m":
                goblin_value += 2 ** i["Level"]
                if i["Level"] > max_goblin_level:
                    max_goblin_level = i["Level"]

            elif i.get("Key") == "c":
                barrel_time_elapsed = i.get("InteractionValue2") / 5

        buyable_goblin_level = (
            self.world_data["Zone"]["ReinforcementsLevel"] - 1
        ) // math.floor(
            1 / self.balance_data["Reinforcements"][0]["LevelMultiplier"]
        ) + 1

        # Manual override for evergreen Goblin Level supreme
        for i in self.world_data["Cards"]:
            if i["Id"] == "ca036":
                buyable_goblin_level += i["Level"]

        # If checkpoint increases goblin level
        if 4 in self.balance_data["CheckPoint"][0]["StatModifierType"]:
            buyable_goblin_level += self.current_checkpoint

        free_goblin_level = max(buyable_goblin_level - 2, 1)
        cannon_goblin_level = max(buyable_goblin_level - 1, 1)
        ad_goblin_level = buyable_goblin_level + 2

        ### SPAWNING CART BARRELS ###
        time_between_barrels = self.balance_data["SpawningCart"][0]["SpawnDelaySecBase"]

        # Manual override for evergreen Spawn Time rares (need to add LTE; values should not be hardcoded)
        for i in self.world_data["Cards"]:
            if i["Id"] == "ca029":
                time_between_barrels -= i["Level"] * 60
                # print(f"(RS) Decreased time_between_barrels by {i['Level'] * 60}")

            if i["Id"] == "ca032":
                time_between_barrels -= i["Level"] * self.current_checkpoint
                # print(f"(RS) Decreased time_between_barrels by {i['Level'] * self.current_checkpoint}")

        # If checkpoint decreases goblin spawn time
        for i, n in enumerate(self.balance_data["CheckPoint"][0]["StatModifierType"]):
            if n == 7:
                time_between_barrels -= (
                    self.current_checkpoint
                    * self.balance_data["CheckPoint"][0]["ModifierBase"][i]
                )
                # print(f"(CP) Decreased time_between_barrels by {self.current_checkpoint * self.balance_data["CheckPoint"][0]["ModifierBase"][i]}")

        ### DELIVERY CYCLE ###
        time_cycle_length = self.balance_data["BalanceProperties"][0][
            "DeliveryMaxDupesResetSec"
        ]
        time_cycle_claim_count_length = self.balance_data["BalanceProperties"][0][
            "DeliveryClaimCountResetSec"
        ]
        time_cycle_claim_count_base = self.balance_data["BalanceProperties"][0][
            "DeliveryDelaySecBase"
        ]
        time_cycle_claim_count_exp = self.balance_data["BalanceProperties"][0][
            "DeliveryDelaySecGrowth"
        ]

        deliveries = self.get_delivery_information()
        deliveries_list_sorted = sorted(
            deliveries["Deliveries"]["Data"], key=lambda d: d["Weight"], reverse=True
        )
        deliveries_claimed_cycle = self.deliveries["DeliveryClaimCount"]

        last_save_datetime = datetime.fromisoformat(self.last_save_time)

        # Working variables; when is the next delivery?
        time_delivery_next_check = datetime.fromisoformat(
            self.deliveries["DeliveryTime"]
        )
        time_delivery_claim_count_reset = datetime.fromisoformat(
            self.deliveries["DeliveryClaimCountResetTime"]
        )
        time_delivery_cycle_reset = datetime.fromisoformat(
            self.deliveries["DeliveryDupeReset"]
        )

        # Working variable; when is the next spawning cart barrel?
        time_between_barrels_next_check = last_save_datetime + timedelta(
            seconds=time_between_barrels - barrel_time_elapsed
        )
        goblin_level_next_check = max_goblin_level + 1
        goblin_value_next_check = 2 ** (max_goblin_level + 1)

        goblin_times = []

        ticks = 0
        while ticks < 7 * 86400:
            # Working variable; timestamp
            simulated_timestamp = last_save_datetime + timedelta(seconds=ticks)

            ## DELIVERY CYCLE ##
            # If current timestamp is greater than the next delivery time
            if simulated_timestamp > time_delivery_next_check:
                # iterate through deliveries until one is found
                for i in deliveries_list_sorted:
                    if i["Count"] < i["Total"]:
                        if i["DeliveryName"] == "Goblin (ad)":
                            goblin_value += 2**ad_goblin_level
                            # print(f"added ad goblin at {simulated_timestamp.strftime('%Y-%m-%d %H:%M:%S')}, value now be {goblin_value}")
                        elif i["DeliveryName"] == "Goblin":
                            goblin_value += 2**free_goblin_level
                            # print(f"added free goblin at {simulated_timestamp.strftime('%Y-%m-%d %H:%M:%S')}, value now be {goblin_value}")

                        i["Count"] += 1
                        break

                # update next delivery time to be the time cycle derivative
                time_delivery_next_check = time_delivery_next_check + timedelta(
                    seconds=time_cycle_claim_count_base
                    * time_cycle_claim_count_exp**deliveries_claimed_cycle
                )
                deliveries_claimed_cycle += 1

                # reset time derivative if reached threshold
                if time_delivery_next_check > time_delivery_claim_count_reset:
                    deliveries_claimed_cycle = 0
                    time_delivery_claim_count_reset = (
                        time_delivery_claim_count_reset
                        + timedelta(seconds=time_cycle_claim_count_length)
                    )

                # reset new cycle if reached threshold
                if time_delivery_next_check > time_delivery_cycle_reset:
                    for i in deliveries_list_sorted:
                        if i["Total"] != -1:
                            i["Count"] = 0

                    time_delivery_cycle_reset = time_delivery_next_check + timedelta(
                        seconds=time_cycle_length
                    )

            ## SPAWNING CART BARRELS ##
            if simulated_timestamp > time_between_barrels_next_check:
                goblin_value += 2**cannon_goblin_level
                # print(f"added barrel goblin at {simulated_timestamp.strftime('%Y-%m-%d %H:%M:%S')}, value now be {goblin_value}")

                time_between_barrels_next_check = (
                    time_between_barrels_next_check
                    + timedelta(seconds=time_between_barrels)
                )

            if goblin_value >= goblin_value_next_check:
                goblin_times.append({"Level": goblin_level_next_check, "Time": ticks})
                goblin_level_next_check += 1
                goblin_value_next_check *= 2

            ticks += 10

        return goblin_times

    def get_active_deliveries(self) -> list:
        deliveries = []

        for i in self.balance_data["Deliveries"]:
            if (
                self.current_rank >= self.current_rank
                and self.current_checkpoint >= self.current_checkpoint
            ):
                deliveries.append(i)

        return deliveries

    def get_delivery_information(self) -> dict:
        delivery_obtained_sum = 0
        delivery_total_sum = 0

        delivery_table_data = {}
        delivery_table_rows = []

        for i in self.get_active_deliveries():
            count = (
                self.claimed_deliveries[str(i["Id"])]
                if str(i["Id"]) in self.claimed_deliveries
                else 0
            )

            delivery_table_row = {
                "Id": i["Id"],
                "DeliveryName": detailed_type[i["RewardModel"]["DetailedType"]]
                + (" (ad)" if i["IsAd"] else ""),
                "Weight": int(i["Weight"]),
                "Count": count,
                "Total": i["MaxDupes"],
            }
            delivery_table_rows.append(delivery_table_row)

            if i["MaxDupes"] != -1:
                delivery_obtained_sum += count
                delivery_total_sum += i["MaxDupes"]

        delivery_table_data["Deliveries"] = {
            "Data": delivery_table_rows,
            "Obtained": delivery_obtained_sum,
            "Total": delivery_total_sum,
        }

        delivery_table_data["Timing"] = self.deliveries

        return delivery_table_data
